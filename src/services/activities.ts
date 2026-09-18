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
 * active = 已报名
 * cancelled = 已取消
 */
export async function listJoinedIds(): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } =
    await supabase
      .from("activity_members")
      .select("activity_id")
      .eq("user_id", user.id)
      .eq("status", "active");

  if (error) {
    throw error;
  }

  return (data ?? []).map(
    (item) => item.activity_id
  );
}


/**
 * 加入活动
 */
export async function joinActivity(
  id: string
) {
  console.log(
    "🔥 joinActivity called",
    id
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "请先登录"
    );
  }


  // 先检查是否已有报名记录
  const { data: existing, error: findError } =
    await supabase
      .from("activity_members")
      .select("*")
      .eq("activity_id", id)
      .eq("user_id", user.id)
      .maybeSingle();


  if (findError) {
    throw findError;
  }


  // 已存在记录
  if (existing) {

    // 已取消，恢复报名
    if (existing.status === "cancelled") {

      const { error } =
        await supabase
          .from("activity_members")
          .update({
            status: "active",
            cancelled_at: null,
          })
          .eq("id", existing.id);

      if (error) {
        throw error;
      }

    } 
    // 已报名，不重复插入
    else {
      return {
        joinedIds:
          await listJoinedIds(),
        event:
          await getActivity(id),
      };
    }

  } 
  // 新报名
  else {

    const { error } =
      await supabase
        .from("activity_members")
        .insert({
          activity_id: id,
          user_id: user.id,
          status: "active",
        });

    if (error) {
      throw error;
    }

  }


  return {
    joinedIds:
      await listJoinedIds(),

    event:
      await getActivity(id),
  };
}


/**
 * 取消参加
 */
export async function cancelActivity(
  id: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();


  if (!user) {
    throw new Error(
      "请先登录"
    );
  }


  const { error } =
    await supabase
      .from("activity_members")
      .update({
        status: "cancelled",
        cancelled_at:
          new Date().toISOString(),
      })
      .eq("activity_id", id)
      .eq("user_id", user.id);


  if (error) {
    throw error;
  }


  return {
    joinedIds:
      await listJoinedIds(),

    event:
      await getActivity(id),
  };
}; /**
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
    error: categoryError,
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
