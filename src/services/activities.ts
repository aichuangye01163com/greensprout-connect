/** 活动领域服务：UI 只依赖这些异步接口，不关心后端实现 */
import { api } from "./api-client";
import { ensureMockRoutes } from "./mock-db";
import {
  CATEGORY_MAP,
  TIME_RANGES,
  daysFromNow,
  makeInviteToken,
  type CategoryId,
  type GSEvent,
  type TimeRangeId,
} from "@/data/greensprout";

ensureMockRoutes();

export interface ActivityQuery {
  timeRange?: TimeRangeId;
  categories?: CategoryId[];
  keyword?: string;
}

export async function listActivities(query: ActivityQuery = {}): Promise<GSEvent[]> {
  const all = await api.get<GSEvent[]>("/activities");
  return filterActivities(all, query);
}

/** 纯函数筛选，方便复用与测试（小程序端可直接复用） */
export function filterActivities(events: GSEvent[], query: ActivityQuery): GSEvent[] {
  const range = TIME_RANGES.find((r) => r.id === query.timeRange);
  return events
    .filter((e) => {
      if (range) {
        const d = daysFromNow(e.startsAt);
        if (d < 0 || d > range.maxDays) return false;
      }
      if (query.categories?.length && !query.categories.includes(e.category)) return false;
      if (query.keyword) {
        const k = query.keyword.toLowerCase();
        const hay = `${e.title}${e.location}${e.tags.join("")}${e.host.name}`.toLowerCase();
        if (!hay.includes(k)) return false;
      }
      return true;
    })
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
}

export async function getActivity(id: string): Promise<GSEvent | null> {
  return api.get<GSEvent | null>(`/activities/${id}`);
}

export async function listJoinedIds(): Promise<string[]> {
  return api.get<string[]>("/me/joined");
}

export async function joinActivity(id: string) {
  return api.post<{ joinedIds: string[]; event: GSEvent }>(`/activities/${id}/join`);
}

export async function cancelActivity(id: string) {
  return api.post<{ joinedIds: string[]; event: GSEvent }>(`/activities/${id}/cancel`);
}

/** 业务规则：活动开始前 2 小时内不可取消 */
export const CANCEL_LOCK_HOURS = 2;

export function canCancel(event: Pick<GSEvent, "startsAt" | "status">, now = Date.now()) {
  if (event.status === "ended") return false;
  return new Date(event.startsAt).getTime() - now > CANCEL_LOCK_HOURS * 3600000;
}

export interface CreateActivityInput {
  title: string;
  category: CategoryId;
  cover: string;
  startsAt: string;
  endsAt: string;
  location: string;
  district: string;
  limit: number;
  tags: string[];
  fee: number;
  deposit: number;
  agenda: { time: string; text: string }[];
  eligibility: GSEvent["eligibility"];
  description: string;
  host: GSEvent["host"];
  isPrivate?: boolean;
  roomPassword?: string;
}

export async function createActivity(input: CreateActivityInput): Promise<GSEvent> {
  const id = `u${Date.now()}`;
  const event: GSEvent = {
    ...input,
    id,
    joined: 1,
    status: "open",
    attendees: [{ name: input.host.name, avatar: input.host.avatar, note: "组织者" }],
    messages: [],
    ...(input.isPrivate ? { inviteToken: makeInviteToken(id) } : {}),
  };
  return api.post<GSEvent>("/activities", event);
}

/* ---------------- 私密活动室 ---------------- */

export function isPrivateEvent(event: Pick<GSEvent, "isPrivate">) {
  return event.isPrivate === true;
}

/** 原型阶段的本地口令校验，后端接入后替换为一次远程校验请求 */
export function verifyRoomPassword(
  event: Pick<GSEvent, "isPrivate" | "roomPassword">,
  input: string,
) {
  if (!event.isPrivate) return true;
  return (event.roomPassword ?? "").trim() === input.trim();
}

/** 生成定向邀请链接（可直接复制分享） */
export function buildInviteLink(event: Pick<GSEvent, "id" | "inviteToken">) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const token = event.inviteToken ?? "";
  return `${origin}/event/${event.id}?invite=${encodeURIComponent(token)}`;
}

export function templateDefaults(category: CategoryId) {
  return CATEGORY_MAP[category];
}
