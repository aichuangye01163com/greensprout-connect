```ts
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
 * 前端分类 -> Supabase activity_categories.slug
 *
 * 这里是前端旧分类体系与数据库大分类体系之间的适配层。
 *
 * 数据库当前分类：
 * sports
 * dining
 * hobbies
 * outdoor
 * games
 * learning
 * other
 *
 * 前端当前分类：
 * run
 * badminton
 * coffee
 * dinner
 * concert
 * women
 * boardgame
 * hiking
 */
const CATEGORY_TO_DB_SLUG: Record<CategoryId, string> = {
  run: "sports",
  badminton: "sports",
  coffee: "dining",
  dinner: "dining",
  concert: "hobbies",
  women: "hobbies",
  boardgame: "games",
  hiking: "outdoor",
};


/**
 * 获取数据库分类 ID
 */
async function getCategoryId(
  category: CategoryId
): Promise<string> {

  const dbSlug =
    CATEGORY_TO_DB_SLUG[category];

  const {
    data,
    error,
  } = await supabase
    .from("activity_categories")
    .select("id")
    .eq("slug", dbSlug)
    .eq("is_active", true)
    .single();

  if (error) {
    console.error(
      "获取活动分类失败:",
      error
    );

    throw new Error(
      `找不到活动分类：${dbSlug}`
    );
  }

  return data.id;
}


/**
 * 获取活动列表
 *
 * 数据来源：
 * Supabase activities 表
 */
export async function listActivities(
  query: ActivityQuery = {}
): Promise<GSEvent[]> {

  const {
    data,
    error,
  } = await supabase
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
    console.error(
      "获取活动失败:",
      error
    );

    throw error;
  }

  const events =
    (data ?? []).map(
      (item) =>
        mapActivityToEvent(item)
    );

  return filterActivities(
    events,
    query
  );
}


/**
 * 前端筛选逻辑
 */
export function filterActivities(
  events: GSEvent[],
  query: ActivityQuery
): GSEvent[] {

  const range =
    TIME_RANGES.find(
      (r) =>
        r.id === query.timeRange
    );

  return events
    .filter((e) => {

      if (range) {

        const d =
          daysFromNow(
            e.startsAt
          );

        if (
          d < 0 ||
          d > range.maxDays
        ) {
          return false;
        }
      }

      if (
        query.categories?.length &&
        !query.categories.includes(
          e.category
        )
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
          ${e.host.name}`
            .toLowerCase();

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

  const {
    data,
    error,
  } = await supabase
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

    if (
      error.code === "PGRST116"
    ) {
      return null;
    }

    throw error;
  }

  return mapActivityToEvent(
    data
  );
}


/**
 * 已参加活动 ID
 *
 * 数据库状态：
 * active
 * cancelled
 */
export async function listJoinedIds()
  : Promise<string[]> {

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const {
    data,
    error,
  } =
    await supabase
      .from("activity_members")
      .select("activity_id")
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "status",
        "active"
      );

  if (error) {
    throw error;
  }

  return (
    data ?? []
  ).map(
    (item) =>
      item.activity_id
  );
}


/**
 * 加入活动
 */
export async function joinActivity(
  id: string
) {

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "请先登录"
    );
  }

  /**
   * 如果用户之前取消过活动，
   * 恢复原来的 activity_members 记录。
   *
   * 如果没有记录，则新建。
   */
  const {
    data: existing,
    error: existingError,
  } =
    await supabase
      .from("activity_members")
      .select("id")
      .eq(
        "activity_id",
        id
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {

    const {
      error,
    } =
      await supabase
        .from("activity_members")
        .update({
          status: "active",
          cancelled_at: null,
        })
        .eq(
          "id",
          existing.id
        );

    if (error) {
      throw error;
    }

  } else {

    const {
      error,
    } =
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
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "请先登录"
    );
  }

  const {
    error,
  } =
    await supabase
      .from("activity_members")
      .update({
        status: "cancelled",
        cancelled_at:
          new Date().toISOString(),
      })
      .eq(
        "activity_id",
        id
      )
      .eq(
        "user_id",
        user.id
      );

  if (error) {
    throw error;
  }

  return {
    joinedIds:
      await listJoinedIds(),

    event:
      await getActivity(id),
  };
}


/**
 * 业务规则：
 * 活动开始前 2 小时不能取消
 */
export const CANCEL_LOCK_HOURS = 2;


export function canCancel(
  event: Pick<
    GSEvent,
    "startsAt" | "status"
  >,
  now = Date.now()
) {

  if (
    event.status === "ended"
  ) {
    return false;
  }

  return (
    new Date(event.startsAt)
      .getTime() -
    now
  ) >
    CANCEL_LOCK_HOURS *
      3600000;
}


/**
 * 创建活动
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

  eligibility:
    GSEvent["eligibility"];

  description: string;

  /**
   * 保留这个字段是为了兼容
   * 现有前端创建活动页面。
   *
   * 实际数据库 host_id
   * 不再相信前端传入的 host，
   * 而是使用当前登录用户。
   */
  host: GSEvent["host"];

  isPrivate?: boolean;

  roomPassword?: string;
}


/**
 * 创建活动
 *
 * 数据来源：
 * Supabase activities
 *
 * 核心规则：
 * 1. 必须登录
 * 2. host_id 使用当前登录用户
 * 3. category_id 从数据库分类表获取
 * 4. 新活动状态为 published
 * 5. 数据库 trigger 自动把创建者加入 activity_members
 */
export async function createActivity(
  input: CreateActivityInput
): Promise<GSEvent> {

  /**
   * 1. 获取当前登录用户
   */
  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "请先登录"
    );
  }


  /**
   * 2. 获取数据库分类 ID
   */
  const categoryId =
    await getCategoryId(
      input.category
    );


  /**
   * 3. 提前生成活动 ID
   *
   * 这样私密活动可以使用同一个 ID
   * 生成 invite token。
   */
  const activityId =
    crypto.randomUUID();


  const inviteToken =
    input.isPrivate
      ? makeInviteToken(
          activityId
        )
      : null;


  /**
   * 4. 写入 Supabase activities
   *
   * 注意：
   * status 必须使用数据库状态：
   * published
   *
   * 不是旧前端状态：
   * open
   */
  const {
    data,
    error,
  } =
    await supabase
      .from("activities")
      .insert({

        id:
          activityId,

        host_id:
          user.id,

        title:
          input.title,

        category_id:
          categoryId,

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
          input.agenda,

        eligibility:
          input.eligibility,

        description:
          input.description,

        status:
          "published",

        is_private:
          input.isPrivate ?? false,

        room_password:
          input.roomPassword ?? null,

        invite_token:
          inviteToken,

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


  /**
   * 5. 写入失败
   */
  if (error) {

    console.error(
      "创建活动失败:",
      error
    );

    throw error;
  }


  /**
   * 6. 数据库 trigger 会自动：
   *
   * activity_members
   * host -> active
   *
   * 这里不再由前端重复插入。
   */
  return mapActivityToEvent(
    data
  );
}


/* ---------------- 私密活动 ---------------- */


export function isPrivateEvent(
  event: Pick<
    GSEvent,
    "isPrivate"
  >
) {
  return event.isPrivate === true;
}


export function verifyRoomPassword(
  event: Pick<
    GSEvent,
    "isPrivate" |
    "roomPassword"
  >,
  input: string
) {

  if (!event.isPrivate) {
    return true;
  }

  return (
    event.roomPassword ?? ""
  )
    .trim() ===
    input.trim();
}


export function buildInviteLink(
  event: Pick<
    GSEvent,
    "id" |
    "inviteToken"
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


export function templateDefaults(
  category: CategoryId
) {
  return CATEGORY_MAP[category];
}
```
