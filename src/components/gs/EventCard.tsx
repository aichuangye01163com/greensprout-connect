import { Link } from "@tanstack/react-router";
import { MapPin, Clock, Users } from "lucide-react";
import { Tag } from "./Chip";
import { Countdown } from "./Countdown";
import { CATEGORY_MAP, fmtDate, fmtTime, type GSEvent } from "@/data/greensprout";

export function EventCard({ event, joined }: { event: GSEvent; joined?: boolean }) {
  const cat = CATEGORY_MAP[event.category];
  const full = event.joined >= event.limit;
  const ended = event.status === "ended";

  return (
    <Link
      to="/event/$id"
      params={{ id: event.id }}
      className="group block overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-[0_8px_28px_-18px_rgba(60,50,30,0.45)]"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-secondary">
        <img
          src={event.cover}
          alt={event.title}
          loading="lazy"
          width={1024}
          height={640}
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${
            ended ? "grayscale opacity-70" : ""
          }`}
        />
        <div className="absolute left-3 top-3 flex gap-2">
          <span className="rounded-full bg-background/85 px-2.5 py-1 text-xs backdrop-blur">
            {cat.emoji} {cat.label}
          </span>
          {ended && (
            <span className="rounded-full bg-foreground/75 px-2.5 py-1 text-xs text-background">
              已结束
            </span>
          )}
          {!ended && full && (
            <span className="rounded-full bg-[color:var(--clay)] px-2.5 py-1 text-xs text-background">
              已满员
            </span>
          )}
          {joined && (
            <span className="rounded-full bg-primary px-2.5 py-1 text-xs text-primary-foreground">
              已报名
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <h3 className="text-[15px] font-medium leading-snug tracking-tight">{event.title}</h3>

        <div className="space-y-1.5 text-[13px] text-muted-foreground">
          <p className="flex items-center gap-2">
            <Clock className="size-3.5 shrink-0" />
            {fmtDate(event.startsAt)} {fmtTime(event.startsAt)} – {fmtTime(event.endsAt)}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="size-3.5 shrink-0" />
            {event.location}
          </p>
          <p className="flex items-center gap-2">
            <Users className="size-3.5 shrink-0" />
            {event.joined}/{event.limit} 已报
            <span className="ml-1 h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
              <span
                className="block h-full rounded-full bg-[color:var(--sprout)]"
                style={{ width: `${Math.min(100, (event.joined / event.limit) * 100)}%` }}
              />
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {event.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3 text-[13px]">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="grid size-6 place-items-center rounded-full bg-accent text-sm">
              {event.host.avatar}
            </span>
            {event.host.name} · 组织 {event.host.hosted} 场
          </span>
          <span className="text-foreground">
            {event.fee === 0 ? "免费" : `¥${event.fee}`}
            {event.deposit > 0 && (
              <span className="ml-1 text-xs text-[color:var(--clay)]">
                含 ¥{event.deposit} 不退定金
              </span>
            )}
          </span>
        </div>

        <p className="text-xs">
          <Countdown iso={event.startsAt} ended={ended} />
        </p>
      </div>
    </Link>
  );
}
