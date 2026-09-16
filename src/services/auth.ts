```ts
/**
 * 完整用户认证系统 —— 使用 Supabase Auth
 *
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
  const result = await supabase.auth.getSession();

  if (result.error) {
    return null;
  }

  const session = result.data.session;

  if (!session || !session.user) {
    return null;
  }

  const profile = await getProfile(session.user.id);

  return {
    user: mapUser(session.user),
    profile,
  };
}

/** 读取 profiles 表 */
export async function getProfile(
  userId: string,
): Promise<Profile | null> {
  const result = await supabase
    .from("profiles")
    .select("id, email, nickname, avatar_url, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (result.error) {
    console.warn(
      "[auth] getProfile error",
      result.error.message,
    );
    return null;
  }

  return result.data;
}

/** 注册 */
export async function signUp(params: {
  email: string;
  password: string;
  nickname?: string;
}): Promise<{ needsEmailConfirmation: boolean }> {
  const email = params.email.trim();
  const password = params.password;
  const nickname = params.nickname?.trim();

  let emailRedirectTo: string | undefined;

  if (typeof window !== "undefined") {
    emailRedirectTo =
      window.location.origin + "/login";
  }

  const options: {
    data: {
      nickname: string;
      avatar_url: string;
    };
    emailRedirectTo?: string;
  } = {
    data: {
      nickname:
        nickname ||
        email.split("@")[0] ||
        "用户",
      avatar_url: "🌱",
    },
  };

  if (emailRedirectTo) {
    options.emailRedirectTo = emailRedirectTo;
  }

  const result = await supabase.auth.signUp({
    email,
    password,
    options,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  const user = result.data.user;

  if (user) {
    const profileResult = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? null,
          nickname:
            nickname ||
            email.split("@")[0] ||
            null,
          avatar_url: "🌱",
        },
        {
          onConflict: "id",
        },
      );

    if (profileResult.error) {
      console.warn(
        "[auth] profile upsert fallback",
        profileResult.error.message,
      );
    }
  }

  const needsEmailConfirmation =
    !result.data.session;

  return {
    needsEmailConfirmation,
  };
}

/** 登录 */
export async function signIn(params: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  const result =
    await supabase.auth.signInWithPassword({
      email: params.email.trim(),
      password: params.password,
    });

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (!result.data.user) {
    throw new Error("登录失败");
  }

  const profile = await getProfile(
    result.data.user.id,
  );

  return {
    user: mapUser(result.data.user),
    profile,
  };
}

/** 退出登录 */
export async function signOut(): Promise<void> {
  const result = await supabase.auth.signOut();

  if (result.error) {
    throw new Error(result.error.message);
  }
}

/** 忘记密码：发送重置邮件 */
export async function requestPasswordReset(
  email: string,
): Promise<void> {
  let redirectTo: string | undefined;

  if (typeof window !== "undefined") {
    redirectTo =
      window.location.origin +
      "/reset-password";
  }

  let result;

  if (redirectTo) {
    result =
      await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo,
        },
      );
  } else {
    result =
      await supabase.auth.resetPasswordForEmail(
        email.trim(),
      );
  }

  if (result.error) {
    throw new Error(result.error.message);
  }
}

/** 用户点击重置邮件后，更新密码 */
export async function updatePassword(
  newPassword: string,
): Promise<void> {
  const result =
    await supabase.auth.updateUser({
      password: newPassword,
    });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

/**
 * 监听 auth 状态变化
 *
 * 保持项目原有的 callback(session) 接口，
 * 不改变其他页面的调用方式。
 */
export function onAuthStateChange(
  callback: (
    session: AuthSession | null,
  ) => void,
) {
  const result =
    supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session || !session.user) {
          callback(null);
          return;
        }

        const authSession: AuthSession = {
          user: mapUser(session.user),
          profile: null,
        };

        callback(authSession);

        setTimeout(() => {
          void getProfile(
            session.user.id,
          ).then((profile) => {
            callback({
              user: mapUser(session.user),
              profile,
            });
          });
        }, 0);
      },
    );

  return () =>
    result.data.subscription.unsubscribe();
}
```
