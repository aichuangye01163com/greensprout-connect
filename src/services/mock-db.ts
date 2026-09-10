/**
 * 原型阶段的持久化数据源。所有 mock 接口在此注册，
 * 使用 localStorage 保存数据，确保刷新后数据不丢失。
 * 接入真实后端时只需配置 VITE_API_BASE_URL，本文件可整体移除。
 */
import { registerMockRoute } from "./api-client";
import { EVENTS, DEFAULT_PROFILE, type GSEvent } from "@/data/greensprout";

const STORAGE_KEY_EVENTS = "gs_events";
const STORAGE_KEY_PROFILE = "gs_profile";
const STORAGE_KEY_JOINED = "gs_joined_ids";
const STORAGE_KEY_SESSION = "gs_session_active";

// 初始化数据：从 localStorage 读取，如果不存在则使用默认值
function initEvents(): GSEvent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_EVENTS);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.warn("Failed to load events from localStorage", e);
  }
  return [...EVENTS];
}

function initProfile() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.warn("Failed to load profile from localStorage", e);
  }
  return null;
}

function initJoinedIds(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_JOINED);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.warn("Failed to load joined IDs from localStorage", e);
  }
  return [];
}

function initSessionActive(profile: typeof DEFAULT_PROFILE | null): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SESSION);
    if (stored === "1") return true;
    if (stored === "0") return false;
  } catch (e) {
    console.warn("Failed to load session from localStorage", e);
  }
  return profile !== null;
}

const db = {
  events: initEvents() as GSEvent[],
  profile: initProfile() as typeof DEFAULT_PROFILE | null,
  joinedIds: initJoinedIds() as string[],
  sessionActive: false,
};
db.sessionActive = initSessionActive(db.profile);

// 持久化到 localStorage 的辅助函数
function saveEvents() {
  try {
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(db.events));
  } catch (e) {
    console.warn("Failed to save events to localStorage", e);
  }
}

function saveProfile() {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(db.profile));
  } catch (e) {
    console.warn("Failed to save profile to localStorage", e);
  }

  function saveSession() {
    try {
      localStorage.setItem(STORAGE_KEY_SESSION, db.sessionActive ? "1" : "0");
    } catch (e) {
      console.warn("Failed to save session to localStorage", e);
    }
  }
}

function saveJoinedIds() {
  try {
    localStorage.setItem(STORAGE_KEY_JOINED, JSON.stringify(db.joinedIds));
  } catch (e) {
    console.warn("Failed to save joined IDs to localStorage", e);
  }
}

function idFrom(path: string, prefix: string) {
  return path.replace(prefix, "").split("/")[0] ?? "";
}

let registered = false;

export function ensureMockRoutes() {
  if (registered) return;
  registered = true;

  registerMockRoute("GET", /^\/activities$/, () => db.events);

  registerMockRoute("GET", /^\/activities\/[^/]+$/, (req) => {
    const id = idFrom(req.path, "/activities/");
    return db.events.find((e) => e.id === id) ?? null;
  });

  registerMockRoute("POST", /^\/activities$/, (req) => {
    const event = req.body as GSEvent;
    db.events = [event, ...db.events];
    saveEvents(); // 💾 持久化
    return event;
  });

  registerMockRoute("POST", /^\/activities\/[^/]+\/join$/, (req) => {
    if (!db.sessionActive || !db.profile) throw new Error("请先登录后再报名");
    const id = idFrom(req.path, "/activities/");
    const actor = db.profile;
    db.events = db.events.map((e) =>
      e.id === id && e.joined < e.limit
        ? {
            ...e,
            joined: e.joined + 1,
            attendees: [
              ...e.attendees,
              { name: actor.nickname, avatar: actor.avatar, note: "刚刚报名" },
            ],
          }
        : e,
    );
    saveEvents(); // 💾 持久化
    if (!db.joinedIds.includes(id)) db.joinedIds = [...db.joinedIds, id];
    saveJoinedIds(); // 💾 持久化
    return { joinedIds: db.joinedIds, event: db.events.find((e) => e.id === id) };
  });

  registerMockRoute("POST", /^\/activities\/[^/]+\/cancel$/, (req) => {
    if (!db.sessionActive || !db.profile) throw new Error("请先登录后再取消报名");
    const id = idFrom(req.path, "/activities/");
    const actor = db.profile;
    db.events = db.events.map((e) =>
      e.id === id
        ? {
            ...e,
            joined: Math.max(0, e.joined - 1),
            attendees: e.attendees.filter((a) => a.name !== actor.nickname),
          }
        : e,
    );
    saveEvents(); // 💾 持久化
    db.joinedIds = db.joinedIds.filter((x) => x !== id);
    saveJoinedIds(); // 💾 持久化
    return { joinedIds: db.joinedIds, event: db.events.find((e) => e.id === id) };
  });

  registerMockRoute("GET", /^\/me\/joined$/, () => (db.sessionActive ? db.joinedIds : []));

  registerMockRoute("GET", /^\/me$/, () => (db.sessionActive ? db.profile : null));

  registerMockRoute("PATCH", /^\/me$/, (req) => {
    const patch = req.body as Record<string, unknown>;
    if (!db.profile) {
      if (!patch || Object.keys(patch).length === 0) throw new Error("请先注册后再保存资料");
      const nickname = typeof patch.nickname === "string" ? patch.nickname.trim() : "";
      const email = typeof patch.email === "string" ? patch.email.trim() : "";
      if (!nickname || !email) throw new Error("请先完成注册资料");
      db.profile = { ...DEFAULT_PROFILE, ...patch, nickname, email };
    } else if (!db.sessionActive) {
      throw new Error("请先登录后再保存资料");
    } else {
      db.profile = { ...db.profile, ...patch };
    }
    db.sessionActive = true;
    saveProfile(); // 💾 持久化
    saveSession(); // 💾 持久化
    return db.profile;
  });

  registerMockRoute("POST", /^\/me\/email\/verify$/, () => {
    if (!db.profile || !db.sessionActive) throw new Error("请先登录后再进行邮箱验证");
    db.profile = { ...db.profile, emailVerified: true };
    saveProfile(); // 💾 持久化
    return db.profile;
  });

  registerMockRoute("GET", /^\/chat\/[^/]+$/, (req) => {
    const id = idFrom(req.path, "/chat/");
    const event = db.events.find((e) => e.id === id);
    return {
      eventId: id,
      unlocked: (event?.joined ?? 0) >= 1,
      dissolvesAt: event?.endsAt ?? null,
      messages: event?.messages ?? [],
    };
  });

  registerMockRoute("POST", /^\/chat\/[^/]+\/messages$/, (req) => {
    if (!db.sessionActive || !db.profile) throw new Error("请先登录后再发言");
    const id = idFrom(req.path, "/chat/");
    const text = (req.body as { text: string }).text;
    const actor = db.profile;
    const msg = {
      name: actor.nickname,
      avatar: actor.avatar,
      text,
      time: "刚刚",
    };
    db.events = db.events.map((e) => (e.id === id ? { ...e, messages: [...e.messages, msg] } : e));
    saveEvents(); // 💾 持久化
    return msg;
  });
}
