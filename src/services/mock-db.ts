import { DEFAULT_EVENTS, DEFAULT_PROFILE, type EventItem } from "@/data/greensprout";
import { ApiError, registerMockRoute, type ApiRequest } from "./api-client";

type UserProfile = typeof DEFAULT_PROFILE;
type UserArchiveFieldType = "text" | "number" | "boolean" | "date" | "email" | "phone";
type UserArchiveFieldValue = string | number | boolean | null;

type UserArchiveFieldDefinition = {
  key: string;
  label: string;
  type: UserArchiveFieldType;
  required: boolean;
  enabled: boolean;
  sort: number;
  placeholder?: string;
};

type MockAccount = {
  email: string;
  password: string | null;
  profile: UserProfile;
  joinedIds: string[];
  archive: {
    profile: UserProfile;
    customFields: Record<string, UserArchiveFieldValue>;
    fieldDefinitions: UserArchiveFieldDefinition[];
    updatedAt: string;
  };
};

type MockDB = {
  events: EventItem[];
  profile: UserProfile | null;
  joinedIds: string[];
  accounts: MockAccount[];
  currentAccountEmail: string | null;
};

const STORAGE_KEYS = {
  events: "gs_events",
  profile: "gs_profile",
  joinedIds: "gs_joined_ids",
  accounts: "gs_accounts",
  currentAccountEmail: "gs_current_account_email",
};

const DEFAULT_ARCHIVE_FIELDS: UserArchiveFieldDefinition[] = [
  {
    key: "phone",
    label: "手机号",
    type: "phone",
    required: false,
    enabled: true,
    sort: 10,
    placeholder: "例如：13800000000",
  },
  {
    key: "city",
    label: "所在城市",
    type: "text",
    required: false,
    enabled: true,
    sort: 20,
    placeholder: "例如：上海",
  },
];

let installed = false;

function nowIso() {
  return new Date().toISOString();
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function normalizePhone(input: string) {
  return input.replace(/[^\d]/g, "");
}

function accountPhone(account: MockAccount): string {
  const v = account.archive.customFields?.phone;
  return typeof v === "string" ? normalizePhone(v) : "";
}

function getJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setJson<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function makeArchive(profile: UserProfile) {
  return {
    profile: clone(profile),
    customFields: {} as Record<string, UserArchiveFieldValue>,
    fieldDefinitions: DEFAULT_ARCHIVE_FIELDS.map((f) => ({ ...f })),
    updatedAt: nowIso(),
  };
}

const demoProfile: UserProfile = {
  ...DEFAULT_PROFILE,
  nickname: "绿芽体验官",
  email: "demo@greensprout.local",
};

const demoAccount: MockAccount = {
  email: "demo@greensprout.local",
  password: "123456",
  profile: clone(demoProfile),
  joinedIds: [],
  archive: makeArchive(demoProfile),
};

const db: MockDB = {
  events: [],
  profile: null,
  joinedIds: [],
  accounts: [],
  currentAccountEmail: null,
};

function saveAll() {
  setJson(STORAGE_KEYS.events, db.events);
  setJson(STORAGE_KEYS.profile, db.profile);
  setJson(STORAGE_KEYS.joinedIds, db.joinedIds);
  setJson(STORAGE_KEYS.accounts, db.accounts);
  setJson(STORAGE_KEYS.currentAccountEmail, db.currentAccountEmail);
}

function loadAll() {
  db.events = getJson<EventItem[]>(STORAGE_KEYS.events, DEFAULT_EVENTS);
  db.accounts = getJson<MockAccount[]>(STORAGE_KEYS.accounts, [demoAccount]);
  db.currentAccountEmail = getJson<string | null>(STORAGE_KEYS.currentAccountEmail, null);
  db.profile = getJson<UserProfile | null>(STORAGE_KEYS.profile, null);
  db.joinedIds = getJson<string[]>(STORAGE_KEYS.joinedIds, []);

  if (!db.accounts.length) db.accounts = [demoAccount];
  if (!db.events.length) db.events = DEFAULT_EVENTS;

  // 兼容老数据（没有 fieldDefinitions 的情况）
  db.accounts = db.accounts.map((a) => ({
    ...a,
    archive: {
      profile: a.archive?.profile ? clone(a.archive.profile) : clone(a.profile),
      customFields: a.archive?.customFields ?? {},
      fieldDefinitions:
        a.archive?.fieldDefinitions?.length > 0
          ? a.archive.fieldDefinitions
          : DEFAULT_ARCHIVE_FIELDS.map((f) => ({ ...f })),
      updatedAt: a.archive?.updatedAt ?? nowIso(),
    },
  }));

  if (db.currentAccountEmail) {
    const account = db.accounts.find((a) => a.email === db.currentAccountEmail);
    if (account) {
      db.profile = clone(account.profile);
      db.joinedIds = [...(account.joinedIds ?? [])];
    }
  }

  saveAll();
}

function requireCurrentAccount() {
  if (!db.currentAccountEmail) throw new ApiError(401, "请先登录");
  const account = db.accounts.find((a) => a.email === db.currentAccountEmail);
  if (!account) throw new ApiError(401, "登录状态失效，请重新登录");
  return account;
}

function syncCurrentAccount() {
  if (!db.currentAccountEmail || !db.profile) return;
  const account = db.accounts.find((a) => a.email === db.currentAccountEmail);
  if (!account) return;
  account.profile = clone(db.profile);
  account.joinedIds = [...db.joinedIds];
  account.archive.profile = clone(db.profile);
  account.archive.updatedAt = nowIso();
}

function getQueryString(req: ApiRequest, key: string) {
  const v = req.query?.[key];
  return v === undefined ? "" : String(v);
}

export function ensureMockRoutes() {
  if (installed) return;
  installed = true;

  loadAll();

  registerMockRoute("GET", /^\/events$/, () => db.events);

  registerMockRoute("GET", /^\/me$/, () => db.profile);

  registerMockRoute("PATCH", /^\/me$/, (req) => {
    const account = requireCurrentAccount();
    const patch = (req.body ?? {}) as Partial<UserProfile>;
    const next = { ...account.profile, ...patch };
    account.profile = next;
    account.archive.profile = clone(next);
    account.archive.updatedAt = nowIso();
    db.profile = clone(next);
    saveAll();
    return db.profile;
  });

  registerMockRoute("POST", /^\/events\/[^/]+\/join$/, (req) => {
    requireCurrentAccount();
    const id = req.path.split("/")[2] ?? "";
    if (!id) throw new ApiError(400, "活动 ID 无效");
    const event = db.events.find((e) => e.id === id);
    if (!event) throw new ApiError(404, "活动不存在");

    if (!db.joinedIds.includes(id)) db.joinedIds.unshift(id);
    syncCurrentAccount();
    saveAll();
    return { joinedIds: db.joinedIds, event };
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
    if (db.accounts.some((a) => a.email === email)) throw new ApiError(409, "该邮箱已注册，请直接登录");
    if (phone && db.accounts.some((a) => accountPhone(a) === phone)) {
      throw new ApiError(409, "该手机号已注册，请直接登录");
    }

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      nickname,
      email,
      emailVerified: false,
      hobbies: [...DEFAULT_PROFILE.hobbies],
    };

    const archive = makeArchive(profile);
    if (phone) archive.customFields.phone = phone;

    const account: MockAccount = {
      email,
      password,
      profile,
      joinedIds: [],
      archive,
    };

    db.accounts = [account, ...db.accounts];
    db.currentAccountEmail = email;
    db.profile = clone(profile);
    db.joinedIds = [];
    saveAll();
    return profile;
  });

  registerMockRoute("POST", /^\/auth\/login$/, (req) => {
    const body = (req.body ?? {}) as { account?: string; email?: string; password?: string };
    const accountInput = body.account?.trim() || body.email?.trim() || "";
    const email = accountInput.toLowerCase();
    const phone = normalizePhone(accountInput);
    const password = body.password?.trim() ?? "";

    const account = db.accounts.find(
      (a) => a.email === email || (phone && accountPhone(a) === phone),
    );

    if (!account) throw new ApiError(401, "邮箱/手机号或密码错误");
    if (account.password === null) throw new ApiError(401, "该账户需要先完成注册后再登录");
    if (account.password !== password) throw new ApiError(401, "邮箱/手机号或密码错误");

    db.currentAccountEmail = account.email;
    db.profile = clone(account.profile);
    db.joinedIds = [...(account.joinedIds ?? [])];
    account.archive.profile = clone(account.profile);
    account.archive.updatedAt = nowIso();
    saveAll();
    return db.profile;
  });

  registerMockRoute("POST", /^\/auth\/logout$/, () => {
    db.profile = null;
    db.joinedIds = [];
    db.currentAccountEmail = null;
    saveAll();
    return { ok: true };
  });

  registerMockRoute("POST", /^\/me\/email\/verify$/, () => {
    const account = requireCurrentAccount();
    account.profile.emailVerified = true;
    account.archive.profile = clone(account.profile);
    account.archive.updatedAt = nowIso();
    db.profile = clone(account.profile);
    saveAll();
    return db.profile;
  });

  registerMockRoute("GET", /^\/me\/archive$/, () => {
    const account = requireCurrentAccount();
    return account.archive;
  });

  registerMockRoute("PATCH", /^\/me\/archive$/, (req) => {
    const account = requireCurrentAccount();
    const body = (req.body ?? {}) as {
      set?: Record<string, UserArchiveFieldValue>;
      remove?: string[];
    };

    const nextFields = { ...(account.archive.customFields ?? {}) };

    Object.entries(body.set ?? {}).forEach(([k, v]) => {
      const enabled = (account.archive.fieldDefinitions ?? []).some((d) => d.key === k && d.enabled);
      if (enabled) nextFields[k] = v;
    });

    (body.remove ?? []).forEach((k) => delete nextFields[k]);

    account.archive.customFields = nextFields;
    account.archive.profile = clone(account.profile);
    account.archive.updatedAt = nowIso();
    saveAll();
    return account.archive;
  });

  registerMockRoute("GET", /^\/me\/archive\/fields$/, () => {
    const account = requireCurrentAccount();
    return [...(account.archive.fieldDefinitions ?? [])].sort((a, b) => a.sort - b.sort);
  });

  registerMockRoute("PATCH", /^\/me\/archive\/fields$/, (req) => {
    const account = requireCurrentAccount();
    const body = (req.body ?? {}) as Partial<UserArchiveFieldDefinition> & { key?: string };
    const key = body.key?.trim();
    if (!key) throw new ApiError(400, "字段 key 不能为空");

    const defs = account.archive.fieldDefinitions ?? [];
    const idx = defs.findIndex((d) => d.key === key);

    const merged: UserArchiveFieldDefinition = {
      key,
      label: body.label?.trim() || (idx >= 0 ? defs[idx].label : key),
      type: body.type ?? (idx >= 0 ? defs[idx].type : "text"),
      required: body.required ?? (idx >= 0 ? defs[idx].required : false),
      enabled: body.enabled ?? (idx >= 0 ? defs[idx].enabled : true),
      sort: body.sort ?? (idx >= 0 ? defs[idx].sort : defs.length * 10 + 10),
      placeholder: body.placeholder ?? (idx >= 0 ? defs[idx].placeholder : undefined),
    };

    if (idx >= 0) defs[idx] = merged;
    else defs.push(merged);

    account.archive.fieldDefinitions = defs.sort((a, b) => a.sort - b.sort);
    account.archive.updatedAt = nowIso();
    saveAll();
    return account.archive.fieldDefinitions;
  });

  registerMockRoute("DELETE", /^\/me\/archive\/fields$/, (req) => {
    const account = requireCurrentAccount();
    const key = getQueryString(req, "key").trim();
    if (!key) throw new ApiError(400, "缺少待删除字段 key");

    account.archive.fieldDefinitions = (account.archive.fieldDefinitions ?? []).filter((d) => d.key !== key);
    if (key in account.archive.customFields) delete account.archive.customFields[key];
    account.archive.updatedAt = nowIso();
    saveAll();
    return account.archive.fieldDefinitions;
  });

  syncCurrentAccount();
}
