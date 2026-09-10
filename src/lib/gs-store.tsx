import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { GSEvent } from "@/data/greensprout";
import { DEFAULT_PROFILE } from "@/data/greensprout";
import * as activities from "@/services/activities";
import * as userService from "@/services/user";
import * as auth from "@/services/auth";
import type { AuthSession } from "@/services/auth";

interface Store {
  events: GSEvent[];
  joinedIds: string[];
  profile: userService.UserProfile | null;
  authEmail: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  join: (id: string) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  isJoined: (id: string) => boolean;
  createEvent: (input: activities.CreateActivityInput) => Promise<GSEvent>;
  saveProfile: (patch: Partial<userService.UserProfile>) => Promise<void>;
  register: (input: userService.RegisterInput) => Promise<void>;
  login: (input: userService.LoginInput) => Promise<void>;
  setAuthSession: (session: AuthSession | null) => void;
  logout: () => void;
  isNewUser: () => boolean;
}

const Ctx = createContext<Store | null>(null);

/** 把 Supabase profile / session 映射到现有 UserProfile 形状，保持页面兼容 */
function mapToUserProfile(session: AuthSession | null): userService.UserProfile | null {
  if (!session) return null;
  const p = session.profile;
  return {
    ...DEFAULT_PROFILE,
    nickname: p?.nickname || session.user.email.split("@")[0] || "用户",
    email: session.user.email || p?.email || "",
    emailVerified: session.user.emailConfirmed,
    avatar: p?.avatar_url || "🌱",
  };
}

export function GSProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<GSEvent[]>([]);
  const [joinedIds, setJoinedIds] = useState<string[]>([]);
  const [profile, setProfile] = useState<userService.UserProfile | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((session: AuthSession | null) => {
    setProfile(mapToUserProfile(session));
    setAuthEmail(session?.user.email ?? null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [e, j, session] = await Promise.all([
        activities.listActivities(),
        activities.listJoinedIds(),
        auth.getSession(),
      ]);
      setEvents(e);
      setJoinedIds(j);
      applySession(session);
    } finally {
      setLoading(false);
    }
  }, [applySession]);

  useEffect(() => {
    void refresh();
    // 监听 Supabase auth 状态（刷新 token、其他标签页登录/退出等）
    const unsub = auth.onAuthStateChange((session) => {
      applySession(session);
    });
    return unsub;
  }, [refresh, applySession]);

  const value = useMemo<Store>(
    () => ({
      events,
      joinedIds,
      profile,
      authEmail,
      loading,
      refresh,
      isJoined: (id) => joinedIds.includes(id),
      join: async (id) => {
        const res = await activities.joinActivity(id);
        setJoinedIds(res.joinedIds);
        setEvents((prev) => prev.map((e) => (e.id === id ? res.event : e)));
      },
      cancel: async (id) => {
        const res = await activities.cancelActivity(id);
        setJoinedIds(res.joinedIds);
        setEvents((prev) => prev.map((e) => (e.id === id ? res.event : e)));
      },
      createEvent: async (input) => {
        const created = await activities.createActivity(input);
        setEvents((prev) => [created, ...prev]);
        return created;
      },
      saveProfile: async (patch) => {
        // 本地 mock 资料仍可更新；后续可同步到 profiles 表
        const p = await userService.updateProfile(patch);
        setProfile(p);
      },
      register: async (input) => {
        await userService.registerAccount(input);
        await refresh();
      },
      login: async (input) => {
        await userService.loginAccount(input);
        await refresh();
      },
      setAuthSession: (session) => {
        applySession(session);
      },
      logout: () => {
        void auth.signOut().catch(() => undefined);
        userService.logout();
        setProfile(null);
        setAuthEmail(null);
        setJoinedIds([]);
      },
      isNewUser: () => profile === null,
    }),
    [events, joinedIds, profile, authEmail, loading, refresh, applySession],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGS() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGS 必须在 GSProvider 内使用");
  return ctx;
}
