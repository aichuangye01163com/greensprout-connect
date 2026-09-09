/** 临时群聊服务：1 人报名即解锁，活动结束 12 小时后解散 */
import { api } from "./api-client";
import { ensureMockRoutes } from "./mock-db";

ensureMockRoutes();

export const DISSOLVE_HOURS_AFTER_END = 12;

export interface ChatMessage {
  name: string;
  avatar: string;
  text: string;
  time: string;
}

export interface ChatRoom {
  eventId: string;
  unlocked: boolean;
  dissolvesAt: string | null;
  messages: ChatMessage[];
}

export async function getChatRoom(eventId: string): Promise<ChatRoom> {
  const room = await api.get<ChatRoom>(`/chat/${eventId}`);
  return {
    ...room,
    dissolvesAt: room.dissolvesAt
      ? new Date(
          new Date(room.dissolvesAt).getTime() + DISSOLVE_HOURS_AFTER_END * 3600000,
        ).toISOString()
      : null,
  };
}

export async function sendMessage(eventId: string, text: string): Promise<ChatMessage> {
  return api.post<ChatMessage>(`/chat/${eventId}/messages`, { text });
}
