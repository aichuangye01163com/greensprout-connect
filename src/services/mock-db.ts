/**
 * 原型阶段的持久化数据源。所有 mock 接口在此注册，
 * 使用 localStorage 保存数据，确保刷新后数据不丢失。
 * 接入真实后端时只需配置 VITE_API_BASE_URL，本文件可整体移除。
 */
import { registerMockRoute } from "./api-client";
import { EVENTS, DEFAULT_PROFILE, type GSEvent } from "@/data/greensprout";
import type { UserProfile } from "./user";

const STORAGE_KEY_EVENTS = "gs_events";
const STORAGE_KEY_PROFILE = "gs_profile";
const STORAGE_KEY_JOINED = "gs_joined_ids";

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

function initProfile(): UserProfile | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (stored) {
      const parsed = JSON.parse(stored) as UserProfile | null;
      if (!parsed) return null;
      return {
        ...DEFAULT_PROFILE,
        ...parsed,
        createdEventIds: Array.isArray(parsed.createdEventIds) ? parsed.createdEventIds : [],
        joinedEventIds: Array.isArray(parsed.joinedEventIds) ? parsed.joinedEventIds : [],
      };
    }
  } catch (e) {
    console.warn("Failed to load profile from localStorage", e);
  }
  return { ...DEFAULT_PROFILE };
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

const db = {
  events: initEvents() as GSEvent[],
  profile: initProfile(),
  joinedIds: initJoinedIds() as string[],
};

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
    if (db.profile) {
      db.profile = {
        ...db.profile,
        createdEventIds: db.profile.createdEventIds.includes(event.id)
          ? db.profile.createdEventIds
          : [event.id, ...db.profile.createdEventIds],
      };
      saveProfile();
    }
    saveEvents(); // 💾 持久化
    return event;
  });

  registerMockRoute("POST", /^\/activities\/[^/]+\/join$/, (req) => {
    const id = idFrom(req.path, "/activities/");
    db.events = db.events.map((e) =>
      e.id === id && e.joined < e.limit
        ? {
            ...e,
            joined: e.joined + 1,
            attendees: [
              ...e.attendees,
              {
                name: db.profile?.nickname ?? "匿名用户",
                avatar: db.profile?.avatar ?? "🌱",
                note: "刚刚报名",
              },
            ],
          }
        : e,
    );
    saveEvents(); // 💾 持久化
    if (!db.joinedIds.includes(id)) db.joinedIds = [...db.joinedIds, id];
    saveJoinedIds(); // 💾 持久化
    if (db.profile) {
      db.profile = {
        ...db.profile,
        joinedEventIds: db.profile.joinedEventIds.includes(id)
          ? db.profile.joinedEventIds
          : [...db.profile.joinedEventIds, id],
      };
      saveProfile();
    }
    return { joinedIds: db.joinedIds, event: db.events.find((e) => e.id === id) };
  });

  registerMockRoute("POST", /^\/activities\/[^/]+\/cancel$/, (req) => {
    const id = idFrom(req.path, "/activities/");
    db.events = db.events.map((e) =>
      e.id === id
        ? {
            ...e,
            joined: Math.max(0, e.joined - 1),
            attendees: e.attendees.filter((a) =>
              db.profile?.nickname ? a.name !== db.profile.nickname : true,
            ),
          }
        : e,
    );
    saveEvents(); // 💾 持久化
    db.joinedIds = db.joinedIds.filter((x) => x !== id);
    saveJoinedIds(); // 💾 持久化
    if (db.profile) {
      db.profile = {
        ...db.profile,
        joinedEventIds: db.profile.joinedEventIds.filter((eventId) => eventId !== id),
      };
      saveProfile();
    }
    return { joinedIds: db.joinedIds, event: db.events.find((e) => e.id === id) };
  });

  registerMockRoute("GET", /^\/me\/joined$/, () => db.joinedIds);

  registerMockRoute("GET", /^\/me$/, () => db.profile);

  registerMockRoute("PATCH", /^\/me$/, (req) => {
    db.profile = { ...db.profile, ...(req.body as object) };
    saveProfile(); // 💾 持久化
    return db.profile;
  });

  registerMockRoute("POST", /^\/me\/email\/verify$/, () => {
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
    const id = idFrom(req.path, "/chat/");
    const text = (req.body as { text: string }).text;
    const msg = {
      name: db.profile?.nickname ?? "匿名用户",
      avatar: db.profile?.avatar ?? "🌱",
      text,
      time: "刚刚",
    };
    db.events = db.events.map((e) =>
      e.id === id ? { ...e, messages: [...e.messages, msg] } : e,
    );
    saveEvents(); // 💾 持久化
    return msg;
  });
}
