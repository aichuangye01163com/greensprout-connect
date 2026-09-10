/** 用户领域服务 */
import { api } from "./api-client";
import { ensureMockRoutes } from "./mock-db";
import type { DEFAULT_PROFILE } from "@/data/greensprout";

ensureMockRoutes();

export type UserProfile = typeof DEFAULT_PROFILE;
export interface RegisterInput {
  nickname: string;
  email: string;
  password: string;
}
export interface LoginInput {
  email: string;
  password: string;
}

const PROFILE_STORAGE_KEY = "gs_profile";
const JOINED_IDS_STORAGE_KEY = "gs_joined_ids";
const STORAGE_KEY_PREFIX = "gs_";

export async function getProfile(): Promise<UserProfile | null> {
  return api.get<UserProfile | null>("/me");
}

export async function updateProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
  return api.patch<UserProfile>("/me", patch);
}

export async function registerAccount(input: RegisterInput): Promise<UserProfile> {
  return api.post<UserProfile>("/auth/register", input);
}

export async function loginAccount(input: LoginInput): Promise<UserProfile> {
  return api.post<UserProfile>("/auth/login", input);
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

/** 清除本地用户资料 */
export function clearProfile() {
  try {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch (e) {
    console.warn("Failed to clear profile from localStorage", e);
  }
}

/** 退出登录并清理本地会话 */
export function logout() {
  void api.post("/auth/logout").catch(() => undefined);
  clearProfile();
  try {
    localStorage.removeItem(JOINED_IDS_STORAGE_KEY);
  } catch (e) {
    console.warn("Failed to clear joined IDs from localStorage", e);
  }
  try {
    const sessionKeys = Array.from({ length: sessionStorage.length }, (_, index) =>
      sessionStorage.key(index),
    ).filter((key): key is string => key?.startsWith(STORAGE_KEY_PREFIX) === true);
    sessionKeys.forEach((key) => sessionStorage.removeItem(key));
  } catch (e) {
    console.warn("Failed to clear sessionStorage", e);
  }
}
