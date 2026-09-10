/**
 * 原型阶段的持久化数据源。所有 mock 接口在此注册，
 * 使用 localStorage 保存数据，确保刷新后数据不丢失。
 * 接入真实后端时只需配置 VITE_API_BASE_URL，本文件可整体移除。
 */
import { ApiError, registerMockRoute } from "./api-client";
import { EVENTS, DEFAULT_PROFILE, type GSEvent } from "@/data/greensprout";

const STORAGE_KEY_EVENTS = "gs_events";
const STORAGE_KEY_PROFILE = "gs_profile";
const STORAGE_KEY_JOINED = "gs_joined_ids";
const STORAGE_KEY_ACCOUNTS = "gs_accounts";
const STORAGE_KEY_CURRENT_ACCOUNT = "gs_current_account_email";

type MockAccount = {
  email: string;
  password: string | null;
  profile: typeof DEFAULT_PROFILE;
  joinedIds: string[];
};

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

function initAccounts(): MockAccount[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.warn("Failed to load accounts from localStorage", e);
  }
  return [];
}

function initCurrentAccountEmail(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CURRENT_ACCOUNT);
    if (stored) return stored;
  } catch (e) {
    console.warn("Failed to load current account from localStorage", e);
  }
  return null;
}

const db = {
  events: initEvents() as GSEvent[],
  profile: initProfile(),
  joinedIds: initJoinedIds() as string[],
  accounts: initAccounts() as MockAccount[],
  currentAccountEmail: initCurrentAccountEmail(),
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

function saveAccounts() {
  try {
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(db.accounts));
  } catch (e) {
    console.warn("Failed to save accounts to localStorage", e);
  }
}

function saveCurrentAccountEmail() {
  try {
    if (db.currentAccountEmail) {
      localStorage.setItem(STORAGE_KEY_CURRENT_ACCOUNT, db.currentAccountEmail);
    } else {
      localStorage.removeItem(STORAGE_KEY_CURRENT_ACCOUNT);
    }
  } catch (e) {
    console.warn("Failed to save current account to localStorage", e);
  }
}

function syncCurrentAccount() {
  if (!db.currentAccountEmail || !db.profile) return;
  db.accounts = db.accounts.map((account) =>
    account.email === db.currentAccountEmail
      ? { ...account, profile: db.profile, joinedIds: db.joinedIds }
      : account,
  );
  saveAccounts();
}

function idFrom(path: string, prefix: string) {
  return path.replace(prefix, "").split("/")[0] ?? "";
}

function requireProfile() {
  if (!db.profile) throw new ApiError(401, "请先登录");
  return db.profile;
}

let registered = false;

export function ensureMockRoutes() {
  if (registered) return;
  registered = true;

  if (!db.currentAccountEmail && db.profile?.email) {
    db.currentAccountEmail = db.profile.email;
    const hasLegacyAccount = db.accounts.some(
      (account) => account.email === db.currentAccountEmail,
    );
    if (!hasLegacyAccount) {
      db.accounts = [
        ...db.accounts,
        {
          email: db.currentAccountEmail,
          password: null,
          profile: db.profile,
          joinedIds: db.joinedIds,
        },
      ];
      saveAccounts();
    }
    saveCurrentAccountEmail();
  }

  if (db.currentAccountEmail) {
    const active = db.accounts.find((account) => account.email === db.currentAccountEmail);
    if (active) {
      db.profile = active.profile;
      db.joinedIds = active.joinedIds ?? [];
      saveProfile();
      saveJoinedIds();
    }
  }

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
    const id = idFrom(req.path, "/activities/");
    const currentProfile = requireProfile();
    db.events = db.events.map((e) =>
      e.id === id && e.joined < e.limit
        ? {
            ...e,
            joined: e.joined + 1,
            attendees: [
              ...e.attendees,
              { name: currentProfile.nickname, avatar: currentProfile.avatar, note: "刚刚报名" },
            ],
          }
        : e,
    );
    saveEvents(); // 💾 持久化
    if (!db.joinedIds.includes(id)) db.joinedIds = [...db.joinedIds, id];
    saveJoinedIds(); // 💾 持久化
    syncCurrentAccount();
    return { joinedIds: db.joinedIds, event: db.events.find((e) => e.id === id) };
  });

  registerMockRoute("POST", /^\/activities\/[^/]+\/cancel$/, (req) => {
    const id = idFrom(req.path, "/activities/");
    const currentProfile = requireProfile();
    db.events = db.events.map((e) =>
      e.id === id
        ? {
            ...e,
            joined: Math.max(0, e.joined - 1),
            attendees: e.attendees.filter((a) => a.name !== currentProfile.nickname),
          }
        : e,
    );
    saveEvents(); // 💾 持久化
    db.joinedIds = db.joinedIds.filter((x) => x !== id);
    saveJoinedIds(); // 💾 持久化
    syncCurrentAccount();
    return { joinedIds: db.joinedIds, event: db.events.find((e) => e.id === id) };
  });

  registerMockRoute("POST", /^\/auth\/register$/, (req) => {
    const body = (req.body ?? {}) as { email?: string; password?: string; nickname?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password?.trim() ?? "";
    const nickname = body.nickname?.trim() ?? "";
    if (!email || !password || !nickname) throw new ApiError(400, "请填写昵称、邮箱和密码");
    if (password.length < 6) throw new ApiError(400, "密码至少 6 位");
    if (db.accounts.some((account) => account.email === email)) {
      throw new ApiError(409, "该邮箱已注册，请直接登录");
    }

    const profile = {
      ...DEFAULT_PROFILE,
      nickname,
      email,
      emailVerified: false,
    };
    const account: MockAccount = { email, password, profile, joinedIds: [] };
    db.accounts = [account, ...db.accounts];
    db.currentAccountEmail = email;
    db.profile = profile;
    db.joinedIds = [];
    saveAccounts();
    saveCurrentAccountEmail();
    saveProfile();
    saveJoinedIds();
    return profile;
  });

  registerMockRoute("POST", /^\/auth\/login$/, (req) => {
    const body = (req.body ?? {}) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password?.trim() ?? "";
    const account = db.accounts.find((item) => item.email === email);
    if (!account) {
      throw new ApiError(401, "邮箱或密码错误");
    }
    if (account.password === null) {
      throw new ApiError(401, "该账户需要先完成注册后再登录");
    }
    if (account.password !== password) {
      throw new ApiError(401, "邮箱或密码错误");
    }
    db.currentAccountEmail = account.email;
    db.profile = account.profile;
    db.joinedIds = account.joinedIds ?? [];
    saveCurrentAccountEmail();
    saveProfile();
    saveJoinedIds();
    return db.profile;
  });

  registerMockRoute("POST", /^\/auth\/logout$/, () => {
    db.profile = null;
    db.joinedIds = [];
    db.currentAccountEmail = null;
    saveProfile();
    saveJoinedIds();
    saveCurrentAccountEmail();
    return { ok: true };
  });

  registerMockRoute("GET", /^\/me\/joined$/, () => db.joinedIds);

  registerMockRoute("GET", /^\/me$/, () => db.profile);

  registerMockRoute("PATCH", /^\/me$/, (req) => {
    db.profile = { ...requireProfile(), ...(req.body as object) };
    saveProfile(); // 💾 持久化
    syncCurrentAccount();
    return db.profile;
  });

  registerMockRoute("POST", /^\/me\/email\/verify$/, () => {
    db.profile = { ...requireProfile(), emailVerified: true };
    saveProfile(); // 💾 持久化
    syncCurrentAccount();
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
    const currentProfile = requireProfile();
    const msg = {
      name: currentProfile.nickname,
      avatar: currentProfile.avatar,
      text,
      time: "刚刚",
    };
    db.events = db.events.map((e) => (e.id === id ? { ...e, messages: [...e.messages, msg] } : e));
    saveEvents(); // 💾 持久化
    return msg;
  });
}
