```ts
/** 用户领域服务 —— Supabase 版本 */
import { supabase } from "@/lib/supabase";
import { DEFAULT_PROFILE } from "@/data/greensprout";
import * as auth from "./auth";

/**
 * UserProfile 现在保留 Supabase Auth / profiles 的唯一用户 ID。
 *
 * profiles.id = auth.users.id
 *
 * 这个 id 后续用于判断：
 * 当前用户是否为某个活动的 host_id。
 */
export type UserProfile = typeof DEFAULT_PROFILE & {
  id: string;
};

export interface RegisterInput {
  nickname: string;
  email: string;
  phone?: string;
  password: string;
}

export interface LoginInput {
  account: string;
  password: string;
}

export type UserArchiveFieldType =
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "email"
  | "phone";

export interface UserArchiveFieldDefinition {
  key: string;
  label: string;
  type: UserArchiveFieldType;
  required: boolean;
  enabled: boolean;
  sort: number;
  placeholder?: string;
}

export type UserArchiveFieldValue = string | number | boolean | null;

export interface UserArchive {
  profile: UserProfile;
  customFields: Record<string, UserArchiveFieldValue>;
  fieldDefinitions: UserArchiveFieldDefinition[];
  updatedAt: string;
}

export interface UpdateUserArchiveInput {
  set?: Record<string, UserArchiveFieldValue>;
  remove?: string[];
}

export interface UpsertArchiveFieldDefinitionInput
  extends Partial<UserArchiveFieldDefinition> {
  key: string;
}

function mapProfile(profile: {
  id: string;
  email?: string | null;
  nickname?: string | null;
  avatar_url?: string | null;
  gender?: string | null;
  age?: number | null;
  city?: string | null;
  district?: string | null;
  education?: string | null;
  university?: string | null;
  career?: string | null;
  income?: string | null;
  bio?: string | null;
  hobbies?: string | null;
  boundaries?: string | null;
  show_liked_activities?: boolean | null;
  show_hosted_activities?: boolean | null;
  email_verified?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}): UserProfile {
  return {
    ...DEFAULT_PROFILE,

    // Supabase Auth / profiles 的唯一用户 ID
    id: profile.id,

    nickname: profile.nickname ?? DEFAULT_PROFILE.nickname,
    email: profile.email ?? DEFAULT_PROFILE.email,
    avatar: profile.avatar_url ?? DEFAULT_PROFILE.avatar,
    emailVerified:
      profile.email_verified ?? DEFAULT_PROFILE.emailVerified,
    gender: profile.gender ?? DEFAULT_PROFILE.gender,
    age: profile.age ?? DEFAULT_PROFILE.age,
    city: profile.city ?? DEFAULT_PROFILE.city,
    district: profile.district ?? DEFAULT_PROFILE.district,
    education: profile.education ?? DEFAULT_PROFILE.education,
    university: profile.university ?? DEFAULT_PROFILE.university,
    career: profile.career ?? DEFAULT_PROFILE.career,
    income: profile.income ?? DEFAULT_PROFILE.income,
    bio: profile.bio ?? DEFAULT_PROFILE.bio,
    hobbies: profile.hobbies ?? DEFAULT_PROFILE.hobbies,
    boundaries: profile.boundaries ?? DEFAULT_PROFILE.boundaries,
    showLikedActivities:
      profile.show_liked_activities ??
      DEFAULT_PROFILE.showLikedActivities,
    showHostedActivities:
      profile.show_hosted_activities ??
      DEFAULT_PROFILE.showHostedActivities,
  };
}

const PROFILE_COLUMNS = `
  id,
  email,
  nickname,
  avatar_url,
  gender,
  age,
  city,
  district,
  education,
  university,
  career,
  income,
  bio,
  hobbies,
  boundaries,
  show_liked_activities,
  show_hosted_activities,
  email_verified,
  created_at,
  updated_at
`;

/**
 * 获取当前登录用户 Profile
 */
export async function getProfile(): Promise<UserProfile | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  return mapProfile(data);
}

/**
 * 更新当前登录用户 Profile
 */
export async function updateProfile(
  patch: Partial<UserProfile>,
): Promise<UserProfile> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    throw new Error("请先登录");
  }

  const updateData: Record<string, unknown> = {};

  if (patch.nickname !== undefined) {
    updateData.nickname = patch.nickname;
  }

  if (patch.email !== undefined && patch.email !== user.email) {
    updateData.email = patch.email;
  }

  if (patch.avatar !== undefined) {
    updateData.avatar_url = patch.avatar;
  }

  if (patch.gender !== undefined) {
    updateData.gender = patch.gender;
  }

  if (patch.age !== undefined) {
    updateData.age = patch.age;
  }

  if (patch.city !== undefined) {
    updateData.city = patch.city;
  }

  if (patch.district !== undefined) {
    updateData.district = patch.district;
  }

  if (patch.education !== undefined) {
    updateData.education = patch.education;
  }

  if (patch.university !== undefined) {
    updateData.university = patch.university;
  }

  if (patch.career !== undefined) {
    updateData.career = patch.career;
  }

  if (patch.income !== undefined) {
    updateData.income = patch.income;
  }

  if (patch.bio !== undefined) {
    updateData.bio = patch.bio;
  }

  if (patch.hobbies !== undefined) {
    updateData.hobbies = patch.hobbies;
  }

  if (patch.boundaries !== undefined) {
    updateData.boundaries = patch.boundaries;
  }

  if (patch.showLikedActivities !== undefined) {
    updateData.show_liked_activities = patch.showLikedActivities;
  }

  if (patch.showHostedActivities !== undefined) {
    updateData.show_hosted_activities = patch.showHostedActivities;
  }

  if (Object.keys(updateData).length === 0) {
    const current = await getProfile();
    if (!current) {
      throw new Error("用户资料不存在");
    }
    return current;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapProfile(data);
}

/**
 * 注册账号
 *
 * 保持原有 user.ts API，内部转给 Supabase Auth。
 */
export async function registerAccount(
  input: RegisterInput,
): Promise<UserProfile | null> {
  const result = await auth.signUp({
    email: input.email,
    password: input.password,
    nickname: input.nickname,
  });

  /*
   * 如果开启邮箱验证，此时通常还没有 session，
   * 所以不能直接读取 profile。
   */
  if (result.needsEmailConfirmation) {
    return null;
  }

  return getProfile();
}

/**
 * 登录账号
 */
export async function loginAccount(
  input: LoginInput,
): Promise<UserProfile> {
  const account = input.account.trim();

  if (!account) {
    throw new Error("请输入邮箱");
  }

  /*
   * 当前 Supabase Auth 使用邮箱登录。
   * 保留 account 字段，是为了不改动现有页面调用接口。
   */
  const session = await auth.signIn({
    email: account,
    password: input.password,
  });

  if (session.profile) {
    return mapProfile(session.profile);
  }

  const profile = await getProfile();

  if (!profile) {
    throw new Error("登录成功，但用户资料不存在");
  }

  return profile;
}

/**
 * 获取当前用户档案
 */
export async function getUserArchive(): Promise<UserArchive> {
  const profile = await getProfile();

  if (!profile) {
    throw new Error("请先登录");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    throw new Error("请先登录");
  }

  const { data: archive, error: archiveError } = await supabase
    .from("user_archive")
    .select("user_id, custom_fields, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (archiveError) {
    throw new Error(archiveError.message);
  }

  const { data: definitions, error: definitionsError } = await supabase
    .from("user_archive_field_definitions")
    .select(
      "key, label, type, required, enabled, sort_order, placeholder",
    )
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  if (definitionsError) {
    throw new Error(definitionsError.message);
  }

  const fieldDefinitions: UserArchiveFieldDefinition[] = (
    definitions ?? []
  ).map((item) => ({
    key: item.key,
    label: item.label,
    type: item.type as UserArchiveFieldType,
    required: item.required,
    enabled: item.enabled,
    sort: item.sort_order,
    placeholder: item.placeholder ?? undefined,
  }));

  return {
    profile,
    customFields:
      (archive?.custom_fields as Record<
        string,
        UserArchiveFieldValue
      >) ?? {},
    fieldDefinitions,
    updatedAt: archive?.updated_at ?? new Date().toISOString(),
  };
}

/**
 * 更新当前用户档案
 */
export async function updateUserArchive(
  input: UpdateUserArchiveInput,
): Promise<UserArchive> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    throw new Error("请先登录");
  }

  const { data: current, error: currentError } = await supabase
    .from("user_archive")
    .select("custom_fields")
    .eq("user_id", user.id)
    .maybeSingle();

  if (currentError) {
    throw new Error(currentError.message);
  }

  const customFields: Record<string, UserArchiveFieldValue> = {
    ...((current?.custom_fields as Record<
      string,
      UserArchiveFieldValue
    >) ?? {}),
  };

  if (input.set) {
    Object.assign(customFields, input.set);
  }

  if (input.remove) {
    for (const key of input.remove) {
      delete customFields[key];
    }
  }

  const { error: upsertError } = await supabase
    .from("user_archive")
    .upsert(
      {
        user_id: user.id,
        custom_fields: customFields,
      },
      {
        onConflict: "user_id",
      },
    );

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  return getUserArchive();
}

/**
 * 获取档案字段定义
 */
export async function getArchiveFieldDefinitions(): Promise<
  UserArchiveFieldDefinition[]
> {
  const { data, error } = await supabase
    .from("user_archive_field_definitions")
    .select(
      "key, label, type, required, enabled, sort_order, placeholder",
    )
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((item) => ({
    key: item.key,
    label: item.label,
    type: item.type as UserArchiveFieldType,
    required: item.required,
    enabled: item.enabled,
    sort: item.sort_order,
    placeholder: item.placeholder ?? undefined,
  }));
}

/**
 * 管理员新增 / 更新档案字段定义
 */
export async function upsertArchiveFieldDefinition(
  input: UpsertArchiveFieldDefinitionInput,
): Promise<UserArchiveFieldDefinition[]> {
  const row: Record<string, unknown> = {
    key: input.key,
  };

  if (input.label !== undefined) row.label = input.label;
  if (input.type !== undefined) row.type = input.type;
  if (input.required !== undefined) row.required = input.required;
  if (input.enabled !== undefined) row.enabled = input.enabled;
  if (input.sort !== undefined) row.sort_order = input.sort;
  if (input.placeholder !== undefined) {
    row.placeholder = input.placeholder;
  }

  const { error } = await supabase
    .from("user_archive_field_definitions")
    .upsert(row, {
      onConflict: "key",
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data, error: selectError } = await supabase
    .from("user_archive_field_definitions")
    .select(
      "key, label, type, required, enabled, sort_order, placeholder",
    )
    .order("sort_order", { ascending: true });

  if (selectError) {
    throw new Error(selectError.message);
  }

  return (data ?? []).map((item) => ({
    key: item.key,
    label: item.label,
    type: item.type as UserArchiveFieldType,
    required: item.required,
    enabled: item.enabled,
    sort: item.sort_order,
    placeholder: item.placeholder ?? undefined,
  }));
}

/**
 * 管理员删除档案字段定义
 */
export async function removeArchiveFieldDefinition(
  key: string,
): Promise<UserArchiveFieldDefinition[]> {
  const { error } = await supabase
    .from("user_archive_field_definitions")
    .delete()
    .eq("key", key);

  if (error) {
    throw new Error(error.message);
  }

  return getArchiveFieldDefinitions();
}

/**
 * 邮箱验证
 *
 * Supabase 邮箱验证由 Auth 邮件链接完成。
 * 保留旧函数，避免页面 import 断掉。
 */
export async function sendVerificationCode(
  email: string,
): Promise<{ sent: true; hint: string }> {
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/login`
      : undefined;

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim(),
    ...(redirectTo ? { options: { emailRedirectTo: redirectTo } } : {}),
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    sent: true,
    hint: `验证邮件已发送至 ${email}`,
  };
}

/**
 * 保留旧接口。
 *
 * Supabase 不使用 8080 这种前端验证码。
 * 真正的邮箱确认由用户点击 Supabase 邮件完成。
 */
export async function verifyEmail(
  _code: string,
): Promise<UserProfile> {
  const profile = await getProfile();

  if (!profile) {
    throw new Error("邮箱验证后未找到用户资料");
  }

  return profile;
}

/**
 * 清除本地用户资料
 *
 * Supabase Auth session 不依赖这个 localStorage，
 * 这里只保留兼容旧代码的清理行为。
 */
export function clearProfile() {
  try {
    localStorage.removeItem("gs_profile");
  } catch (e) {
    console.warn(
      "Failed to clear profile from localStorage",
      e,
    );
  }
}

/**
 * 清理旧的本地会话痕迹。
 *
 * 真正的 Supabase logout 由 auth.signOut() 负责。
 */
export function logout() {
  clearProfile();

  try {
    localStorage.removeItem("gs_joined_ids");
  } catch (e) {
    console.warn(
      "Failed to clear joined IDs from localStorage",
      e,
    );
  }

  try {
    const sessionKeys = Array.from(
      { length: sessionStorage.length },
      (_, index) => sessionStorage.key(index),
    ).filter(
      (key): key is string =>
        key?.startsWith("gs_") === true,
    );

    sessionKeys.forEach((key) =>
      sessionStorage.removeItem(key),
    );
  } catch (e) {
    console.warn(
      "Failed to clear sessionStorage",
      e,
    );
  }
}
```
