import type { GSEvent } from "@/data/greensprout";
import type { Database } from "@/integrations/supabase/types";


type ActivityRow =
  Database["public"]["Tables"]["activities"]["Row"];

type CategoryRow =
  Database["public"]["Tables"]["activity_categories"]["Row"];

type ProfileRow =
  Database["public"]["Tables"]["profiles"]["Row"];


/**
 * Supabase 分类 slug
 * 转换为前端 GSEvent 使用的 CategoryId
 */
function mapCategory(slug: string): GSEvent["category"] {

  const map: Record<string, GSEvent["category"]> = {

    // 跑步
    run: "run",
    running: "run",
    jogging: "run",

    // 羽毛球
    badminton: "badminton",

    // 咖啡
    coffee: "coffee",
    cafe: "coffee",

    // 晚餐 / 美食
    dinner: "dinner",
    food: "dinner",
    meal: "dinner",

    // 音乐
    concert: "concert",
    music: "concert",

    // 女性活动
    women: "women",
    female: "women",

    // 桌游
    boardgame: "boardgame",
    board_game: "boardgame",

    // 徒步
    hiking: "hiking",
    hike: "hiking",
    outdoor: "hiking",
  };


  return map[slug] ?? "coffee";
}


/**
 * Supabase activities 表
 * 转换为前端 GSEvent
 */
export function mapActivityToEvent(
  activity: ActivityRow & {
    activity_categories?: CategoryRow | null;
    profiles?: ProfileRow | null;
  }
): GSEvent {

  return {

    id: activity.id,


    title: activity.title,


    category: mapCategory(
      activity.activity_categories?.slug ?? ""
    ),


    cover:
      activity.cover ?? "",


    startsAt:
      activity.starts_at,


    endsAt:
      activity.ends_at,


    location:
      activity.location,


    district:
      activity.district ?? "",



    limit:
      activity.participant_limit,



    joined:
      0,



    fee:
      Number(activity.fee ?? 0),



    deposit:
      Number(activity.deposit ?? 0),



    agenda:
      Array.isArray(activity.agenda)
        ? activity.agenda as GSEvent["agenda"]
        : [],



    eligibility:
      activity.eligibility as GSEvent["eligibility"],



    description:
      activity.description ?? "",



    host: {

      name:
        activity.profiles?.nickname ??
        "用户",


      avatar:
        activity.profiles?.avatar_url ??
        "",

    },



    tags: [],



    attendees: [],



    messages: [],



    status:
      activity.status === "ended"
        ? "ended"
        : "open",



    isPrivate:
      activity.is_private,



    ...(activity.invite_token
      ? {
          inviteToken:
            activity.invite_token,
        }
      : {}),



    ...(activity.room_password
      ? {
          roomPassword:
            activity.room_password,
        }
      : {}),

  };
}
