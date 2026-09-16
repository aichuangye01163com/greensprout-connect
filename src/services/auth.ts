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

export async function signUp(params: {
email: string;
password: string;
nickname?: string;
}): Promise<{ needsEmailConfirmation: boolean }> {
const email = params.email.trim();
const password = params.password;
const nickname = params.nickname?.trim();

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

if (typeof window !== "undefined") {
options.emailRedirectTo =
window.location.origin + "/login";
}

const result = await supabase.auth.signUp({
email,
password,
options,
});

if (result.error) {
throw new Error(result.error.message);
}

if (result.data.user) {
const profileResult = await supabase
.from("profiles")
.upsert(
{
id: result.data.user.id,
email: result.data.user.email ?? null,
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

```
if (profileResult.error) {
  console.warn(
    "[auth] profile upsert fallback",
    profileResult.error.message,
  );
}
```

}

return {
needsEmailConfirmation: !result.data.session,
};
}

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

export async function signOut(): Promise<void> {
const result = await supabase.auth.signOut();

if (result.error) {
throw new Error(result.error.message);
}
}

export async function requestPasswordReset(
email: string,
): Promise<void> {
let redirectTo: string | undefined;

if (typeof window !== "undefined") {
redirectTo =
window.location.origin +
"/reset-password";
}

if (redirectTo) {
const result =
await supabase.auth.resetPasswordForEmail(
email.trim(),
{
redirectTo,
},
);

```
if (result.error) {
  throw new Error(result.error.message);
}

return;
```

}

const result =
await supabase.auth.resetPasswordForEmail(
email.trim(),
);

if (result.error) {
throw new Error(result.error.message);
}
}

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

export function onAuthStateChange(
callback: (
event: string,
session: AuthSession | null,
) => void,
) {
const {
data: { subscription },
} = supabase.auth.onAuthStateChange(
(event, session) => {
if (!session || !session.user) {
callback(event, null);
return;
}

```
  const mappedSession: AuthSession = {
    user: mapUser(session.user),
    profile: null,
  };

  callback(event, mappedSession);

  setTimeout(() => {
    void getProfile(session.user.id).then(
      (profile) => {
        callback(event, {
          user: mapUser(session.user),
          profile,
        });
      },
    );
  }, 0);
},
```

);

return () => {
subscription.unsubscribe();
};
}
