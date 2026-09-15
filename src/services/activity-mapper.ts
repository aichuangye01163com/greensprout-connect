import type { GSEvent } from "@/data/greensprout";
import type { Database } from "@/integrations/supabase/types";

type ActivityRow =
  Database["public"]["Tables"]["activities"]["Row"];

type CategoryRow =
  Database["public"]["Tables"]["activity_categories"]["Row"];

type ProfileRow =
  Database["public"]["Tables"]["profiles"]["Row"];


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

    category:
      (activity.activity_categories?.slug ??
        "other") as GSEvent["category"],

    cover:
      activity.cover ?? "",

    startsAt: activity.starts_at,

    endsAt: activity.ends_at,

    location: activity.location,

    district:
      activity.district ?? "",


    limit:
      activity.participant_limit,


    joined: 0,


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
      activity.status === "confirmed"
        ? "confirmed"
        : activity.status === "cancelled"
          ? "cancelled"
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
