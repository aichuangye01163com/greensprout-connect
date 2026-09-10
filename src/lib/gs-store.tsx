import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { GSEvent } from "@/data/greensprout";
import * as activities from "@/services/activities";
import * as userService from "@/services/user";

interface Store {
  events: GSEvent[];
  joinedIds: string[];
  profile: userService.UserProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  join: (id: string) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  isJoined: (id: string) => boolean;
  createEvent: (input: activities.CreateActivityInput) => Promise<GSEvent>;
  saveProfile: (patch: Partial<userService.UserProfile>) => Promise<void>;
  logout: () => void;
  isNewUser: () => boolean;
}

const Ctx = createContext<Store | null>(null);

export function GSProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<GSEvent[]>([]);
  const [joinedIds, setJoinedIds] = useState<string[]>([]);
  const [profile, setProfile] = useState<userService.UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionVersionRef = useRef(0);

  const refresh = useCallback(async () => {
    const sessionVersion = sessionVersionRef.current;
    const loggedOut = userService.isLoggedOut();
    const [e, j, p] = await Promise.all([
      activities.listActivities(),
      activities.listJoinedIds(),
      loggedOut ? Promise.resolve(null) : userService.getProfile(),
    ]);
    if (sessionVersion !== sessionVersionRef.current) return;
    setEvents(e);
    if (userService.isLoggedOut()) {
      setJoinedIds([]);
      setProfile(null);
    } else {
      setJoinedIds(j);
      setProfile(p);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<Store>(
    () => ({
      events,
      joinedIds,
      profile,
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
        const p = await userService.updateProfile(patch);
        setProfile(p);
      },
      logout: () => {
        sessionVersionRef.current += 1;
        userService.logout();
        setProfile(null);
        setJoinedIds([]);
        setLoading(false);
      },
      isNewUser: () => {
        // 判断是否为新用户：profile 为 null
        return profile === null;
      },
    }),
    [events, joinedIds, profile, loading, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGS() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGS 必须在 GSProvider 内使用");
  return ctx;
}
