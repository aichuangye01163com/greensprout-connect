/**
 * 原型阶段的内存数据源。所有 mock 接口在此注册，
 * 接入真实后端时只需配置 VITE_API_BASE_URL，本文件可整体移除。
 */
import { registerMockRoute } from "./api-client";
import { EVENTS, DEFAULT_PROFILE, type GSEvent } from "@/data/greensprout";

const db = {
  events: [...EVENTS] as GSEvent[],
  profile: { ...DEFAULT_PROFILE },
  joinedIds: [] as string[],
};

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
              { name: db.profile.nickname, avatar: db.profile.avatar, note: "刚刚报名" },
            ],
          }
        : e,
    );
    if (!db.joinedIds.includes(id)) db.joinedIds = [...db.joinedIds, id];
    return { joinedIds: db.joinedIds, event: db.events.find((e) => e.id === id) };
  });

  registerMockRoute("POST", /^\/activities\/[^/]+\/cancel$/, (req) => {
    const id = idFrom(req.path, "/activities/");
    db.events = db.events.map((e) =>
      e.id === id
        ? {
            ...e,
            joined: Math.max(0, e.joined - 1),
            attendees: e.attendees.filter((a) => a.name !== db.profile.nickname),
          }
        : e,
    );
    db.joinedIds = db.joinedIds.filter((x) => x !== id);
    return { joinedIds: db.joinedIds, event: db.events.find((e) => e.id === id) };
  });

  registerMockRoute("GET", /^\/me\/joined$/, () => db.joinedIds);

  registerMockRoute("GET", /^\/me$/, () => db.profile);

  registerMockRoute("PATCH", /^\/me$/, (req) => {
    db.profile = { ...db.profile, ...(req.body as object) };
    return db.profile;
  });

  registerMockRoute("POST", /^\/me\/email\/verify$/, () => {
    db.profile = { ...db.profile, emailVerified: true };
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
      name: db.profile.nickname,
      avatar: db.profile.avatar,
      text,
      time: "刚刚",
    };
    db.events = db.events.map((e) =>
      e.id === id ? { ...e, messages: [...e.messages, msg] } : e,
    );
    return msg;
  });
}
