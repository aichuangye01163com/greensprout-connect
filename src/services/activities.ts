/** 活动领域服务：UI 只依赖这些异步接口 */

import { supabase } from "@/integrations/supabase/client";
import { mapActivityToEvent } from "./activity-mapper";

import {
  CATEGORY_MAP,
  TIME_RANGES,
  daysFromNow,
  makeInviteToken,
  type CategoryId,
  type GSEvent,
  type TimeRangeId,
} from "@/data/greensprout";

export interface ActivityQuery {
  timeRange?: TimeRangeId;
  categories?: CategoryId[];
  keyword?: string;
}

/**
 * 获取活动列表
 */
export async function listActivities(
  query: ActivityQuery = {}
): Promise<GSEvent[]> {
  const { data, error } = await supabase
    .from("activities")
    .select(`
      *,
      activity_categories (
        id,
        name,
        slug
      ),
      profiles (
        id,
        nickname,
        avatar_url
      )
    `)
    .order("starts_at", {
      ascending: true,
    });

  if (error) {
    console.error("获取活动失败:", error);
    throw error;
  }

  const events = (data ?? []).map((item) =>
    mapActivityToEvent(item)
  );

  return filterActivities(events, query);
}


/**
 * 前端筛选逻辑
 */
export function filterActivities(
  events: GSEvent[],
  query: ActivityQuery
): GSEvent[] {
  const range = TIME_RANGES.find(
    (r) => r.id === query.timeRange
  );

  return events
    .filter((e) => {
      if (range) {
        const d = daysFromNow(e.startsAt);

        if (d < 0 || d > range.maxDays) {
          return false;
        }
      }

      if (
        query.categories?.length &&
        !query.categories.includes(e.category)
      ) {
        return false;
      }

      if (query.keyword) {
        const k =
          query.keyword.toLowerCase();

        const hay =
          `${e.title}
          ${e.location}
          ${e.tags.join("")}
          ${e.host.name}`.toLowerCase();

        if (!hay.includes(k)) {
          return false;
        }
      }

      return true;
    })
    .sort(
      (a, b) =>
        +new Date(a.startsAt) -
        +new Date(b.startsAt)
    );
}


/**
 * 获取单个活动
 */
export async function getActivity(
  id: string
): Promise<GSEvent | null> {
  const { data, error } = await supabase
    .from("activities")
    .select(`
      *,
      activity_categories (
        id,
        name,
        slug
      ),
      profiles (
        id,
        nickname,
        avatar_url
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }

    throw error;
  }

  return mapActivityToEvent(data);
}


/**
 * 已参加活动 ID
 *
 * 数据库状态统一：
 * approved = 已报名成功
 * pending = 等待发起者审核
 * cancelled = 已取消
 */
export async function listJoinedIds(): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("activity_members")
    .select("activity_id")
    .eq("user_id", user.id)
    .eq("status", "approved");

  if (error) {
    throw error;
  }

  return (data ?? []).map(
    (item) => item.activity_id
  );
}


/**
 * 加入活动
 *
 * 新业务逻辑：
 * 用户报名 = pending
 * 等待发起者审核
 */
export async function joinActivity(id: string) {
  console.log("🔥 joinActivity called", id);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("请先登录");
  }


  // 1. 查询已有报名记录
  const { data: existing } =
    await supabase
      .from("activity_members")
      .select("*")
      .eq("activity_id", id)
      .eq("user_id", user.id)
      .maybeSingle();


  if (existing) {

    if (existing.status === "approved") {
      throw new Error("你已经报名成功");
    }


    if (existing.status === "pending") {
      throw new Error("报名申请已提交，请等待发起者审核");
    }


    // cancelled 可以重新报名
    const { error } =
      await supabase
        .from("activity_members")
        .update({
          status: "pending",
          cancelled_at: null,
        })
        .eq("id", existing.id);


    if (error) {
      throw error;
    }

  } else {


    // 新报名
    const { error } =
      await supabase
        .from("activity_members")
        .insert({
          activity_id: id,
          user_id: user.id,
          status: "pending",
        });


    if (error) {
      throw error;
    }
  }


  return {
    joinedIds: await listJoinedIds(),
    event: await getActivity(id),
  };
}


/**
 * 待审核报名者
 *
 * 只读取指定活动中 status = pending 的报名记录。
 *
 * 注意：
 * 这里不自行判断当前用户是不是发起者。
 * 真正的数据访问权限由 Supabase RLS 控制。
 */
export interface PendingActivityMember {
  id: string;
  activityId: string;
  userId: string;
  status: "pending";
  profile: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
  } | null;
}

export async function getPendingMembers(
  activityId: string
): Promise<PendingActivityMember[]> {
  const { data, error } = await supabase
    .from("activity_members")
    .select(`
      id,
      activity_id,
      user_id,
      status,
      profiles (
        id,
        nickname,
        avatar_url
      )
    `)
    .eq("activity_id", activityId)
    .eq("status", "pending")
    .order("id", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    activityId: item.activity_id,
    userId: item.user_id,
    status: "pending",
    profile: item.profiles
      ? {
          id: item.profiles.id,
          nickname: item.profiles.nickname,
          avatarUrl: item.profiles.avatar_url,
        }
      : null,
  }));
}


/**
 * 审核通过报名
 *
 * pending → approved
 *
 * 数据库 RLS 会再次验证：
 * 当前用户必须是该活动发起者或 admin。
 *
 * approved 后：
 * activity_members trigger
 *      ↓
 * sync_activity_member_to_chat()
 *      ↓
 * chat_members.status = active
 */
export async function approveMember(
  memberId: string
): Promise<void> {
  const { error } = await supabase
    .from("activity_members")
    .update({
      status: "approved",
    })
    .eq("id", memberId)
    .eq("status", "pending");

  if (error) {
    throw error;
  }
}


/**
 * 业务规则：
 * 活动开始前2小时不能取消
 */
export const CANCEL_LOCK_HOURS = 2;

export function canCancel(
  event: Pick<GSEvent, "startsAt" | "status">,
  now = Date.now()
) {
  if (event.status === "ended") {
    return false;
  }

  return (
    new Date(event.startsAt).getTime() - now >
    CANCEL_LOCK_HOURS * 3600000
  );
}


/**
 * 创建活动输入
 */
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

  agenda: {
    time: string;
    text: string;
  }[];

  eligibility: GSEvent["eligibility"];

  description: string;

  host: GSEvent["host"];

  isPrivate?: boolean;

  roomPassword?: string;
}


/**
 * 前端分类 -> 数据库分类 slug
 */
function getDbCategorySlug(
  category: CategoryId
): string {

  switch (category) {

    case "run":
    case "badminton":
      return "sports";


    case "coffee":
    case "dinner":
      return "dining";


    case "concert":
    case "women":
      return "hobbies";


    case "boardgame":
      return "games";


    case "hiking":
      return "outdoor";


    default:
      throw new Error(
        `不支持的活动分类：${category}`
      );
  }
}


/**
 * 创建活动
 */
export async function createActivity(
  input: CreateActivityInput
): Promise<GSEvent> {

  const {
    data: { user },
  } = await supabase.auth.getUser();


  if (!user) {
    throw new Error(
      "请先登录"
    );
  }


  const dbCategorySlug =
    getDbCategorySlug(
      input.category
    );


  const {
    data: categoryRow,
    error: categoryError
  } =
    await supabase
      .from("activity_categories")
      .select("id")
      .eq(
        "slug",
        dbCategorySlug
      )
      .eq(
        "is_active",
        true
      )
      .single();


  if (
    categoryError ||
    !categoryRow
  ) {
    throw new Error(
      `找不到活动分类：${dbCategorySlug}`
    );
  }


  const {
    data,
    error,
  } =
    await supabase
      .from("activities")
      .insert({

        host_id:
          user.id,

        title:
          input.title,

        category_id:
          categoryRow.id,

        cover:
          input.cover,

        starts_at:
          input.startsAt,

        ends_at:
          input.endsAt,

        location:
          input.location,

        district:
          input.district,

        participant_limit:
          input.limit,

        fee:
          input.fee,

        deposit:
          input.deposit,

        agenda:
          input.agenda as unknown as never,

        eligibility:
          input.eligibility as unknown as never,

        description:
          input.description,

        is_private:
          input.isPrivate ?? false,

        room_password:
          input.roomPassword ?? null,

        invite_token:
          input.isPrivate
            ? makeInviteToken(
                crypto.randomUUID()
              )
            : null,

        status:
          "published",

      })
      .select(`
        *,
        activity_categories (
          id,
          name,
          slug
        ),
        profiles (
          id,
          nickname,
          avatar_url
        )
      `)
      .single();


  if (error) {
    throw error;
  }


  return mapActivityToEvent(
    data
  );
}


/**
 * 私密活动
 */
export function isPrivateEvent(
  event: Pick<GSEvent, "isPrivate">
) {
  return event.isPrivate === true;
}


/**
 * 验证活动室密码
 */
export function verifyRoomPassword(
  event: Pick<
    GSEvent,
    "isPrivate" | "roomPassword"
  >,
  input: string
) {

  if (!event.isPrivate) {
    return true;
  }


  return (
    (event.roomPassword ?? "")
      .trim() ===
    input.trim()
  );
}


/**
 * 创建邀请链接
 */
export function buildInviteLink(
  event: Pick<
    GSEvent,
    "id" | "inviteToken"
  >
) {

  const origin =
    typeof window === "undefined"
      ? ""
      : window.location.origin;


  return `${origin}/event/${event.id}?invite=${encodeURIComponent(
    event.inviteToken ?? ""
  )}`;

}


/**
 * 模板默认值
 */
export function templateDefaults(
  category: CategoryId
) {
  return CATEGORY_MAP[category];
}
