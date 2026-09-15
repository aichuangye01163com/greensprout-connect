/** 活动领域服务：UI 只依赖这些异步接口 */

import { supabase } from "@/integrations/supabase/client";
import { mapActivityToEvent } from "./mapper";

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
 * 数据来源：
 * Supabase activities 表
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
    console.error(
      "获取活动失败:",
      error
    );

    throw error;
  }


  const events = (data ?? []).map(
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
      (a,b)=>
        +new Date(a.startsAt)
        -
        +new Date(b.startsAt)
    );

}



/**
 * 获取单个活动
 */
export async function getActivity(
  id:string
):Promise<GSEvent|null>{


  const {data,error}=await supabase
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
    .eq("id",id)
    .single();



  if(error){

    if(error.code==="PGRST116"){
      return null;
    }

    throw error;
  }


  return mapActivityToEvent(data);

}



/**
 * 已参加活动 ID
 */
export async function listJoinedIds()
:Promise<string[]>{


 const {
   data:{
    user
   }
 } = await supabase.auth.getUser();



 if(!user){
   return [];
 }



 const {
   data,
   error
 } = await supabase
 .from("activity_members")
 .select("activity_id")
 .eq(
   "user_id",
   user.id
 )
 .eq(
   "status",
   "joined"
 );



 if(error){
   throw error;
 }


 return (
   data ?? []
 ).map(
   item =>
   item.activity_id
 );

}



/**
 * 加入活动
 */
export async function joinActivity(
 id:string
){


 const {
   data:{
    user
   }
 } =
 await supabase.auth.getUser();



 if(!user){
   throw new Error(
    "请先登录"
   );
 }



 const {
   error
 } =
 await supabase
 .from("activity_members")
 .insert({
   activity_id:id,
   user_id:user.id,
   status:"joined"
 });



 if(error){
   throw error;
 }



 return {
   joinedIds:
    await listJoinedIds(),

   event:
    await getActivity(id)
 };

}



/**
 * 取消参加
 */
export async function cancelActivity(
 id:string
){


 const {
   data:{
    user
   }
 } =
 await supabase.auth.getUser();



 if(!user){
   throw new Error(
    "请先登录"
   );
 }



 const {
   error
 } =
 await supabase
 .from("activity_members")
 .update({

   status:"cancelled",

   cancelled_at:
    new Date()
    .toISOString()

 })
 .eq(
   "activity_id",
   id
 )
 .eq(
   "user_id",
   user.id
 );



 if(error){
   throw error;
 }



 return {
   joinedIds:
    await listJoinedIds(),

   event:
    await getActivity(id)
 };

}



/**
 * 业务规则：
 * 活动开始前2小时不能取消
 */
export const CANCEL_LOCK_HOURS = 2;


export function canCancel(
 event:Pick<
 GSEvent,
 "startsAt"|"status"
 >,
 now=Date.now()
){


 if(
  event.status==="ended"
 ){
  return false;
 }


 return (
  new Date(event.startsAt)
  .getTime()
  -
  now
 )
 >
 CANCEL_LOCK_HOURS*
 3600000;

}



/**
 * 创建活动
 */
export interface CreateActivityInput {

 title:string;

 category:CategoryId;

 cover:string;

 startsAt:string;

 endsAt:string;

 location:string;

 district:string;

 limit:number;

 tags:string[];

 fee:number;

 deposit:number;

 agenda:{
  time:string;
  text:string;
 }[];

 eligibility:
 GSEvent["eligibility"];

 description:string;

 host:
 GSEvent["host"];

 isPrivate?:boolean;

 roomPassword?:string;

}



export async function createActivity(
 input:CreateActivityInput
):Promise<GSEvent>{


 const {
   data:{
    user
   }
 } =
 await supabase.auth.getUser();


 if(!user){
  throw new Error(
   "请先登录"
  );
 }


 const {
  data,
  error
 }
 =
 await supabase
 .from("activities")
 .insert({

   host_id:user.id,

   title:input.title,

   cover:input.cover,

   starts_at:input.startsAt,

   ends_at:input.endsAt,

   location:input.location,

   district:input.district,

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

   is_private:
    input.isPrivate ?? false,

   room_password:
    input.roomPassword ?? null,

   invite_token:
    input.isPrivate
    ?
    makeInviteToken(
      crypto.randomUUID()
    )
    :
    null,

   status:"open"

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



 if(error){
   throw error;
 }



 return mapActivityToEvent(data);

}



/* 私密活动 */

export function isPrivateEvent(
 event:Pick<GSEvent,"isPrivate">
){
 return event.isPrivate===true;
}



export function verifyRoomPassword(
 event:Pick<
 GSEvent,
 "isPrivate"|
 "roomPassword"
 >,
 input:string
){

 if(!event.isPrivate)
 {
  return true;
 }


 return (
  event.roomPassword ?? ""
 )
 .trim()
 ===
 input.trim();

}



export function buildInviteLink(
 event:Pick<
 GSEvent,
 "id"|
 "inviteToken"
 >
){


 const origin =
 typeof window==="undefined"
 ?
 ""
 :
 window.location.origin;



 return `${origin}/event/${event.id}?invite=${encodeURIComponent(event.inviteToken ?? "")}`;

}



export function templateDefaults(
 category:CategoryId
){
 return CATEGORY_MAP[category];
}
