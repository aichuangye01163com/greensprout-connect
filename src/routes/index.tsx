import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/gs/AppShell";
import { Chip } from "@/components/gs/Chip";
import { EventCard } from "@/components/gs/EventCard";
import { useGS } from "@/lib/gs-store";
import { filterActivities } from "@/services/activities";
import { CATEGORIES, TIME_RANGES, type CategoryId, type TimeRangeId } from "@/data/greensprout";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "绿芽局 GreenSprout · 同城即时活动大厅" },
      {
        name: "description",
        content: "发现身边正在发生的跑圈、羽毛球、咖啡、晚餐与音乐会小局，几步报名，认识真实的人。",
      },
      { property: "og:title", content: "绿芽局 GreenSprout · 同城即时活动大厅" },
      {
        property: "og:description",
        content: "同城小型活动即时报名，4-8 人的真实相遇。",
      },
    ],
  }),
  component: Discovery,
});

function Discovery() {
  const { events, loading, isJoined, profile } = useGS();
  const [timeRange, setTimeRange] = useState<TimeRangeId>("1month");
  const [cats, setCats] = useState<CategoryId[]>([]);
  const [keyword, setKeyword] = useState("");

  const list = useMemo(
    () => filterActivities(events, { timeRange, categories: cats, keyword }),
    [events, timeRange, cats, keyword],
  );

  const toggleCat = (id: CategoryId) =>
    setCats((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  return (
    <AppShell>
      <section className="space-y-5">
        <header className="space-y-1">
          <h1 className="text-xl tracking-tight">今天，去认识几个真实的人</h1>
          <p className="text-sm text-muted-foreground">上海 · 共 {events.length} 场同城小局</p>
        </header>
        {!profile && (
          <div className="rounded-2xl border border-border bg-card/90 p-4">
            <p className="mb-3 text-sm text-muted-foreground">
              先登录或注册，报名后即可进入临时群聊。
            </p>
            <div className="flex gap-2">
              <Link
                to="/login"
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground transition-colors hover:bg-secondary/50"
              >
                登录
              </Link>
              <Link
                to="/register"
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-secondary px-4 py-2 text-sm text-foreground transition-colors hover:bg-secondary/80"
              >
                注册
              </Link>
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜活动、地点或组织者"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="-mx-5 space-y-2.5 px-5">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TIME_RANGES.map((r) => (
              <Chip key={r.id} active={timeRange === r.id} onClick={() => setTimeRange(r.id)}>
                {r.label}
              </Chip>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Chip active={cats.length === 0} onClick={() => setCats([])}>
              全部
            </Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c.id} active={cats.includes(c.id)} onClick={() => toggleCat(c.id)}>
                {c.emoji} {c.label}
              </Chip>
            ))}
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl border border-border bg-card/60" />
              ))
            : list.map((e) => <EventCard key={e.id} event={e} joined={isJoined(e.id)} />)}
        </section>
      </section>
    </AppShell>
  );
}
