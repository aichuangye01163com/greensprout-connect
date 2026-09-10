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
  archive: UserArchive;
};

type UserArchiveFieldValue = string | number | boolean | null;
type UserArchive = {
  profile: typeof DEFAULT_PROFILE;
  customFields: Record<string, UserArchiveFieldValue>;
  updatedAt: string;
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
    if (stored) {
      const parsed = JSON.parse(stored) as unknown[];
      return parsed
        .map((raw) => normalizeAccount(raw))
        .filter((account): account is MockAccount => account !== null);
    }
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

function cloneProfile(profile: typeof DEFAULT_PROFILE) {
  return { ...profile, hobbies: [...profile.hobbies] };
}

function cloneArchive(archive: UserArchive) {
  return {
    profile: cloneProfile(archive.profile),
    customFields: { ...archive.customFields },
    updatedAt: archive.updatedAt,
  };
}

function nowIso() {
  return new Date().toISOString();
}

function normalizePhone(input: string) {
  return input.replace(/[^\d+]/g, "");
}

function accountPhone(account: MockAccount) {
  const raw = account.archive.customFields["phone"];
  if (typeof raw !== "string") return "";
  return normalizePhone(raw);
}

function makeArchive(profile: typeof DEFAULT_PROFILE): UserArchive {
  return {
    profile: cloneProfile(profile),
    customFields: {},
    updatedAt: nowIso(),
  };
}

function normalizeAccount(raw: unknown): MockAccount | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Partial<MockAccount> & { archive?: Partial<UserArchive> };
  if (!source.email || typeof source.email !== "string") return null;
  const fallbackProfile = cloneProfile(
    (source.profile as typeof DEFAULT_PROFILE | undefined) ?? DEFAULT_PROFILE,
  );
  const archiveProfile = source.archive?.profile
    ? cloneProfile(source.archive.profile as typeof DEFAULT_PROFILE)
    : fallbackProfile;
  return {
    email: source.email,
    password: typeof source.password === "string" ? source.password : null,
    profile: fallbackProfile,
    joinedIds: Array.isArray(source.joinedIds)
      ? source.joinedIds.filter((id): id is string => typeof id === "string")
      : [],
    archive: {
      profile: archiveProfile,
      customFields:
        source.archive?.customFields && typeof source.archive.customFields === "object"
          ? { ...source.archive.customFields }
          : {},
      updatedAt:
        typeof source.archive?.updatedAt === "string" ? source.archive.updatedAt : nowIso(),
    },
  };
}

function syncCurrentAccount() {
  if (!db.currentAccountEmail || !db.profile) return;
  db.accounts = db.accounts.map((account) =>
    account.email === db.currentAccountEmail
      ? {
          ...account,
          profile: cloneProfile(db.profile),
          joinedIds: [...db.joinedIds],
          archive: {
            ...cloneArchive(account.archive),
            profile: cloneProfile(db.profile),
            updatedAt: nowIso(),
          },
        }
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
          profile: cloneProfile(db.profile),
          joinedIds: [...db.joinedIds],
          archive: makeArchive(db.profile),
        },
      ];
      saveAccounts();
    }
    saveCurrentAccountEmail();
  }

  if (db.currentAccountEmail) {
    const active = db.accounts.find((account) => account.email === db.currentAccountEmail);
    if (active) {
      db.profile = cloneProfile(active.profile);
      db.joinedIds = [...(active.joinedIds ?? [])];
      active.archive.profile = cloneProfile(db.profile);
      saveProfile();
      saveJoinedIds();
      saveAccounts();
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
    const body = (req.body ?? {}) as {
      email?: string;
      phone?: string;
      password?: string;
      nickname?: string;
    };
    const email = body.email?.trim().toLowerCase() ?? "";
    const phone = normalizePhone(body.phone?.trim() ?? "");
    const password = body.password?.trim() ?? "";
    const nickname = body.nickname?.trim() ?? "";
    if (!email || !password || !nickname) throw new ApiError(400, "请填写昵称、邮箱和密码");
    if (password.length < 6) throw new ApiError(400, "密码至少 6 位");
    if (db.accounts.some((account) => account.email === email)) {
      throw new ApiError(409, "该邮箱已注册，请直接登录");
    }
    if (phone && db.accounts.some((account) => accountPhone(account) === phone)) {
      throw new ApiError(409, "该手机号已注册，请直接登录");
    }

    const profile = {
      ...DEFAULT_PROFILE,
      nickname,
      email,
      emailVerified: false,
      hobbies: [...DEFAULT_PROFILE.hobbies],
    };
    const account: MockAccount = {
      email,
      password,
      profile,
      joinedIds: [],
      archive: {
        ...makeArchive(profile),
        customFields: phone ? { phone } : {},
      },
    };
    db.accounts = [account, ...db.accounts];
    db.currentAccountEmail = email;
    db.profile = cloneProfile(profile);
    db.joinedIds = [];
    saveAccounts();
    saveCurrentAccountEmail();
    saveProfile();
    saveJoinedIds();
    return profile;
  });

  registerMockRoute("POST", /^\/auth\/login$/, (req) => {
    const body = (req.body ?? {}) as { account?: string; email?: string; password?: string };
    const accountInput = body.account?.trim() || body.email?.trim() || "";
    const email = accountInput.toLowerCase();
    const phone = normalizePhone(accountInput);
    const password = body.password?.trim() ?? "";
    const account = db.accounts.find(
      (item) => item.email === email || (phone && accountPhone(item) === phone),
    );
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
    db.profile = cloneProfile(account.profile);
    db.joinedIds = [...(account.joinedIds ?? [])];
    account.archive.profile = cloneProfile(db.profile);
    account.archive.updatedAt = nowIso();
    saveCurrentAccountEmail();
    saveProfile();
    saveJoinedIds();
    saveAccounts();
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

  registerMockRoute("GET", /^\/me\/archive$/, () => {
    const currentProfile = requireProfile();
    const account = db.accounts.find((item) => item.email === currentProfile.email);
    if (!account) throw new ApiError(404, "未找到当前账户档案");
    return cloneArchive(account.archive);
  });

  registerMockRoute("PATCH", /^\/me\/archive$/, (req) => {
    const body = (req.body ?? {}) as {
      set?: Record<string, UserArchiveFieldValue>;
      remove?: string[];
    };
    const currentProfile = requireProfile();
    const currentEmail = currentProfile.email;
    const setFields = body.set ?? {};
    const removeFields = body.remove ?? [];
    const isValidFieldName = (name: string) => /^[a-zA-Z][\w-]{1,63}$/.test(name);
    const isValidFieldValue = (value: unknown): value is UserArchiveFieldValue =>
      ["string", "number", "boolean"].includes(typeof value) || value === null;
    db.accounts = db.accounts.map((account) => {
      if (account.email !== currentEmail) return account;
      const nextArchive = cloneArchive(account.archive);
      Object.entries(setFields).forEach(([key, value]) => {
        if (!isValidFieldName(key)) throw new ApiError(400, `非法字段名: ${key}`);
        if (!isValidFieldValue(value)) throw new ApiError(400, `字段值类型不支持: ${key}`);
        nextArchive.customFields[key] = value;
      });
      removeFields.forEach((key) => {
        if (!isValidFieldName(key)) throw new ApiError(400, `非法字段名: ${key}`);
        delete nextArchive.customFields[key];
      });
      nextArchive.profile = cloneProfile(currentProfile);
      nextArchive.updatedAt = nowIso();
      return { ...account, archive: nextArchive };
    });
    saveAccounts();
    const account = db.accounts.find((item) => item.email === currentEmail);
    if (!account) throw new ApiError(404, "未找到当前账户档案");
    return cloneArchive(account.archive);
  });

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
