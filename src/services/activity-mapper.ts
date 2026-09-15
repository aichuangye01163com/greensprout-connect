import type { GSEvent, CategoryId } from "@/data/greensprout";
import { CATEGORIES } from "@/data/greensprout";
import type { Database } from "@/integrations/supabase/types";


type ActivityRow =
  Database["public"]["Tables"]["activities"]["Row"];

type CategoryRow =
  Database["public"]["Tables"]["activity_categories"]["Row"];

type ProfileRow =
  Database["public"]["Tables"]["profiles"]["Row"];


/**
 * Supabase 分类 slug → 前端 CategoryId
 * 防止数据库分类变化导致页面崩溃
 */
function normalizeCategory(
  slug?: string | null
): CategoryId {

  switch (slug) {

    case "run":
    case "running":
    case "跑步":
      return "run";

    case "badminton":
    case "羽毛球":
      return "badminton";

    case "coffee":
    case "咖啡":
      return "coffee";

    case "dinner":
    case "food":
    case "晚餐":
      return "dinner";

    case "concert":
    case "music":
      return "concert";

    case "women":
    case "female":
      return "women";

    case "boardgame":
    case "game":
      return "boardgame";

    case "hiking":
    case "outdoor":
      return "hiking";

    default:
      /**
       * 如果后台新增分类，
       * 不允许前端白屏
       */
      return "coffee";
  }
}


/**
 * Supabase activities
 * 转换为前端 GSEvent
 */
export function mapActivityToEvent(
  activity: ActivityRow & {
    activity_categories?: CategoryRow | null;
    profiles?: ProfileRow | null;
  }
): GSEvent {


  const category = normalizeCategory(
    activity.activity_categories?.slug
  );


  return {

    id: activity.id,


    title: activity.title,


    category,


    cover:
      activity.cover ??
      CATEGORIES.find(
        c => c.id === category
      )?.cover ??
      "",


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
      (activity.eligibility ??
        {
          ageRange:[18,60],
          gender:"不限",
          education:"不限",
          income:"不限"
        }) as GSEvent["eligibility"],



    description:
      activity.description ?? "",



    host: {

      name:
        activity.profiles?.nickname ??
        "用户",


      avatar:
        activity.profiles?.avatar_url ??
        "🌱",

      city:"",
      hosted:0,
      rating:5,
      bio:"",

    },



    tags: [],



    attendees: [],



    messages: [],



    status:
      activity.status === "cancelled"
        ? "ended"
        : "open",



    isPrivate:
      activity.is_private,



    ...(activity.invite_token
      ? {
          inviteToken:
            activity.invite_token
        }
      : {}),



    ...(activity.room_password
      ? {
          roomPassword:
            activity.room_password
        }
      : {}),

  };
}
