/** 用户领域服务 */
import { api } from "./api-client";
import { clearMockUserSession, ensureMockRoutes } from "./mock-db";
import type { DEFAULT_PROFILE } from "@/data/greensprout";

ensureMockRoutes();

export type UserProfile = typeof DEFAULT_PROFILE;

const PROFILE_STORAGE_KEY = "gs_profile";
const JOINED_IDS_STORAGE_KEY = "gs_joined_ids";
const LOGOUT_SESSION_KEY = "gs_logged_out";

export async function getProfile(): Promise<UserProfile> {
  return api.get<UserProfile>("/me");
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

/** 清除本地用户资料 */
export function clearProfile() {
  try {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch (e) {
    console.warn("Failed to clear profile from localStorage", e);
  }
}

export function isLoggedOut() {
  try {
    return sessionStorage.getItem(LOGOUT_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function clearSessionStorage() {
  try {
    const keys = Array.from({ length: sessionStorage.length }, (_, index) =>
      sessionStorage.key(index),
    )
      .filter((key): key is string => key?.startsWith("gs_") === true)
      .filter((key) => key !== LOGOUT_SESSION_KEY);
    keys.forEach((key) => sessionStorage.removeItem(key));
  } catch (e) {
    console.warn("Failed to clear session storage", e);
  }
}

export function logout() {
  clearProfile();
  clearMockUserSession();
  try {
    localStorage.removeItem(JOINED_IDS_STORAGE_KEY);
  } catch (e) {
    console.warn("Failed to clear joined IDs from localStorage", e);
  }
  clearSessionStorage();
  try {
    sessionStorage.setItem(LOGOUT_SESSION_KEY, "1");
  } catch (e) {
    console.warn("Failed to set logout session marker", e);
  }
}
