import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { GSEvent } from "@/data/greensprout";
import * as activities from "@/services/activities";
import * as userService from "@/services/user";

interface Store {
  events: GSEvent[];
  createdEvents: GSEvent[];
  joinedEvents: GSEvent[];
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
  const [createdEvents, setCreatedEvents] = useState<GSEvent[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<GSEvent[]>([]);
  const [joinedIds, setJoinedIds] = useState<string[]>([]);
  const [profile, setProfile] = useState<userService.UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [e, j, p] = await Promise.all([
      activities.listActivities(),
      activities.listJoinedIds(),
      userService.getProfile(),
    ]);
    setEvents(e);
    setJoinedIds(j);
    setProfile(p);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setCreatedEvents(activities.pickCreatedEvents(events, profile));
    setJoinedEvents(activities.pickJoinedEvents(events, profile));
  }, [events, profile]);

  const value = useMemo<Store>(
    () => ({
      events,
      createdEvents,
      joinedEvents,
      joinedIds,
      profile,
      loading,
      refresh,
      isJoined: (id) => joinedIds.includes(id),
      join: async (id) => {
        const res = await activities.joinActivity(id);
        setJoinedIds(res.joinedIds);
        setEvents((prev) => prev.map((e) => (e.id === id ? res.event : e)));
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                joinedEventIds: prev.joinedEventIds.includes(id)
                  ? prev.joinedEventIds
                  : [...prev.joinedEventIds, id],
              }
            : prev,
        );
      },
      cancel: async (id) => {
        const res = await activities.cancelActivity(id);
        setJoinedIds(res.joinedIds);
        setEvents((prev) => prev.map((e) => (e.id === id ? res.event : e)));
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                joinedEventIds: prev.joinedEventIds.filter((eventId) => eventId !== id),
              }
            : prev,
        );
      },
      createEvent: async (input) => {
        const created = await activities.createActivity(input);
        setEvents((prev) => [created, ...prev]);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                createdEventIds: prev.createdEventIds.includes(created.id)
                  ? prev.createdEventIds
                  : [created.id, ...prev.createdEventIds],
              }
            : prev,
        );
        return created;
      },
      saveProfile: async (patch) => {
        const p = await userService.updateProfile(patch);
        setProfile(p);
      },
      logout: () => {
        userService.logout();
        setProfile(null);
        setJoinedIds([]);
        setCreatedEvents([]);
        setJoinedEvents([]);
      },
      isNewUser: () => {
        // 判断是否为新用户：profile 为 null
        return profile === null;
      },
    }),
    [events, createdEvents, joinedEvents, joinedIds, profile, loading, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGS() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGS 必须在 GSProvider 内使用");
  return ctx;
}
