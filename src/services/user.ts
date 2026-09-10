/** 用户领域服务 */
import { api } from "./api-client";
import { ensureMockRoutes } from "./mock-db";
import type { DEFAULT_PROFILE } from "@/data/greensprout";

ensureMockRoutes();

export type UserProfile = typeof DEFAULT_PROFILE;

const PROFILE_STORAGE_KEY = "gs_profile";
const SESSION_STORAGE_KEY = "gs_session_active";

export async function getProfile(): Promise<UserProfile | null> {
  return api.get<UserProfile | null>("/me");
}

export async function updateProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
  return api.patch<UserProfile>("/me", patch);
}

/** 邮箱验证（原型为模拟流程） */
export async function sendVerificationCode(email: string): Promise<{ sent: true; hint: string }> {
  await new Promise((r) => setTimeout(r, 400));
  return { sent: true, hint: `验证码已发送至 ${email}（演示验证码：8080）` };
}

export async function verifyEmail(code: string): Promise<UserProfile> {
  if (code.trim() !== "8080") throw new Error("验证码不正确，演示验证码为 8080");
  return api.post<UserProfile>("/me/email/verify");
}

/** 退出当前登录态（保留账号资料） */
export function logout() {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, "0");
  } catch (e) {
    console.warn("Failed to clear session from localStorage", e);
  }
}

/** 兼容旧调用：仅退出登录态，不删除账户资料 */
export const clearProfile = logout;
