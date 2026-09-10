/**
 * 完整用户认证系统 —— 使用 Supabase Auth
 * 密码由 Supabase 管理，前端不存储密码
 */
import { supabase, type Profile } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export type AuthUser = {
  id: string;
  email: string;
  emailConfirmed: boolean;
};

export type AuthSession = {
  user: AuthUser;
  profile: Profile | null;
};

function mapUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? "",
    emailConfirmed: !!user.email_confirmed_at,
  };
}

/** 获取当前会话 + profile */
export async function getSession(): Promise<AuthSession | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session?.user) return null;

  const profile = await getProfile(session.user.id);
  return {
    user: mapUser(session.user),
    profile,
  };
}

/** 读取 profiles 表 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, nickname, avatar_url, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[auth] getProfile error", error.message);
    return null;
  }
  return data;
}

/** 注册：邮箱 + 密码，发送验证邮件；成功后自动创建 profile（触发器 + 客户端兜底） */
export async function signUp(params: {
  email: string;
  password: string;
  nickname?: string;
}): Promise<{ needsEmailConfirmation: boolean }> {
  const { email, password, nickname } = params;

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        nickname: nickname?.trim() || email.split("@")[0],
        avatar_url: "🌱",
      },
      emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
    },
  });

  if (error) throw new Error(error.message);

  // 客户端兜底：如果触发器未及时写入，手动插入一次
  if (data.user) {
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: data.user.id,
        email: data.user.email,
        nickname: nickname?.trim() || email.split("@")[0],
        avatar_url: "🌱",
      },
      { onConflict: "id" },
    );
    if (profileError) {
      console.warn("[auth] profile upsert fallback", profileError.message);
    }
  }

  // 如果项目开启了邮箱确认，session 可能为空
  const needsEmailConfirmation = !data.session;
  return { needsEmailConfirmation };
}

/** 登录 */
export async function signIn(params: { email: string; password: string }): Promise<AuthSession> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: params.email.trim(),
    password: params.password,
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("登录失败");

  const profile = await getProfile(data.user.id);
  return {
    user: mapUser(data.user),
    profile,
  };
}

/** 退出登录 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/** 忘记密码：发送重置邮件 */
export async function requestPasswordReset(email: string): Promise<void> {
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });
  if (error) throw new Error(error.message);
}

/** 重置密码（用户点击邮件链接后到达 /reset-password 页面调用） */
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

/** 监听 auth 状态变化 */
export function onAuthStateChange(callback: (session: AuthSession | null) => void) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user) {
      callback(null);
      return;
    }
    const profile = await getProfile(session.user.id);
    callback({
      user: mapUser(session.user),
      profile,
    });
  });
  return () => subscription.unsubscribe();
}
