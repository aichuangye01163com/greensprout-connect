import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, MapPin, Clock, Users, ShieldCheck, Send, Lock, KeyRound } from "lucide-react";
import { AppShell } from "@/components/gs/AppShell";
import { Tag } from "@/components/gs/Chip";
import { Countdown } from "@/components/gs/Countdown";
import { InviteCard } from "@/components/gs/InviteCard";
import { useGS } from "@/lib/gs-store";
import { canCancel, CANCEL_LOCK_HOURS, verifyRoomPassword } from "@/services/activities";
import { getChatRoom, sendMessage, DISSOLVE_HOURS_AFTER_END, type ChatRoom } from "@/services/chat";
import { CATEGORY_MAP, fmtDate, fmtTime } from "@/data/greensprout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/event/$id")({
  validateSearch: (search: Record<string, unknown>): { invite?: string } =>
    typeof search['invite'] === "string" ? { invite: search['invite'] } : {},
  head: () => ({
    meta: [
      { title: "活动详情 · 绿芽局 GreenSprout" },
      { name: "description", content: "查看活动日程、地点、参与者与报名条件，一键报名同城小局。" },
      { property: "og:title", content: "活动详情 · 绿芽局 GreenSprout" },
      { property: "og:description", content: "查看日程、参与者与报名条件，一键报名。" },
    ],
  }),
  component: EventDetail,
});

function EventDetail() {
  const { id } = Route.useParams();
  const { invite } = Route.useSearch();
  const router = useRouter();
  const { events, isJoined, join, cancel, profile, loading, isNewUser } = useGS();
  const event = events.find((e) => e.id === id);

  const [confirmJoin, setConfirmJoin] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [askPassword, setAskPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [draft, setDraft] = useState("");
  const [askRegister, setAskRegister] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // 当通过邀请链接进入私密活动室时，检查是否为新用户
  useEffect(() => {
    if (invite && event && event.isPrivate && !isJoined(event.id)) {
      if (isNewUser()) {
        // 新用户提示注册
        setAskRegister(true);
      } else {
        // 已注册用户自动弹出密码框
        setAskPassword(true);
      }
    }
  }, [invite, event, isJoined, isNewUser]);

  useEffect(() => {
    if (!event) return;
    void getChatRoom(event.id).then(setRoom);
  }, [event?.id, event?.joined]);


  if (loading) {
    return (
      <AppShell>
        <p className="py-20 text-center text-sm text-muted-foreground">加载中…</p>
      </AppShell>
    );
  }

  if (!event) {
    return (
      <AppShell>
        <div className="py-20 text-center">
          <p className="text-sm text-muted-foreground">没有找到这场活动。</p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary underline">
            返回活动大厅
          </Link>
        </div>
      </AppShell>
    );
  }

  const cat = CATEGORY_MAP[event.category];
  const joined = isJoined(event.id);
  const full = event.joined >= event.limit;
  const ended = event.status === "ended";
  const cancellable = canCancel(event);
  const isPrivate = event.isPrivate === true;
  const isHost = !!profile && profile.nickname === event.host.name;
  const viaInvite = !!invite;

  const enterChat = () => {
    window.setTimeout(() => chatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };

  const doJoin = async () => {
    await join(event.id);
    setConfirmJoin(false);
    setAskPassword(false);
    setPassword("");
    setPwError("");
    toast.success(isPrivate ? "密码正确，已进入活动室临时群" : "报名成功，临时群已解锁");
    enterChat();
  };

  const startJoin = () => {
    // 私密活动且通过邀请链接进入的新用户需要提示注册
    if (isNewUser() && viaInvite && isPrivate) {
      setAskRegister(true);
      return;
    }
    
    if (isPrivate) {
      setPwError("");
      setPassword("");
      setAskPassword(true);
    } else {
      setConfirmJoin(true);
    }
  };

  const submitPassword = async () => {
    if (!verifyRoomPassword(event, password)) {
      setPwError("密码不正确，请向邀请你的人确认");
      return;
    }
    await doJoin();
  };

  const doCancel = async () => {
    await cancel(event.id);
    setConfirmCancel(false);
    toast("已取消报名");
  };


  const doSend = async () => {
    if (!draft.trim()) return;
    await sendMessage(event.id, draft.trim());
    setDraft("");
    setRoom(await getChatRoom(event.id));
  };

  const badges = [
    `年龄 ${event.eligibility.ageRange[0]}–${event.eligibility.ageRange[1]} 岁`,
    `性别 ${event.eligibility.gender}`,
    `学历 ${event.eligibility.education}`,
    `年收入 ${event.eligibility.income}`,
    ...(event.eligibility.note ? [event.eligibility.note] : []),
  ];

  return (
    <AppShell>
      <div className="space-y-6 pb-24">
        <button
          type="button"
          onClick={() => router.history.back()}
          className="flex items-center gap-1 text-sm text-muted-foreground active:opacity-60"
        >
          <ChevronLeft className="size-4" />
          返回活动大厅
        </button>

        {isPrivate && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
              <Lock className="mt-0.5 size-4 shrink-0 text-[color:var(--clay)]" />
              <p className="min-w-0 text-muted-foreground">
                {viaInvite ? "你通过定向邀请链接进入这场私密活动室。" : "这是一场私密活动室。"}
                点击「报名加入」并输入活动室密码，即可报名并直接进入临时群。
              </p>
            </div>
            {(isHost || joined) && <InviteCard event={event} />}
          </div>
        )}


        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <img
            src={event.cover}
            alt={event.title}
            width={1024}
            height={640}
            className={`aspect-[16/9] w-full object-cover ${ended ? "grayscale opacity-70" : ""}`}
          />
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-secondary px-2.5 py-1">
                {cat.emoji} {cat.label}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 ${
                  ended
                    ? "bg-foreground/80 text-background"
                    : full
                      ? "bg-[color:var(--clay)] text-background"
                      : "bg-primary text-primary-foreground"
                }`}
              >
                {ended ? "已结束" : full ? "已满员" : "报名中"}
              </span>
              <Countdown iso={event.startsAt} ended={ended} />
            </div>

            <h1 className="text-lg leading-snug tracking-tight">{event.title}</h1>

            <div className="space-y-1.5 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <Clock className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0">
                  {fmtDate(event.startsAt)} {fmtTime(event.startsAt)} – {fmtTime(event.endsAt)}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0">{event.location}</span>
              </p>
              <p className="flex items-center gap-2">
                <Users className="size-4 shrink-0" />
                {event.joined}/{event.limit} 已报
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {event.tags.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>

            <p className="text-sm leading-relaxed text-foreground/80">{event.description}</p>

            <div className="flex items-center justify-between rounded-xl bg-secondary/70 px-3 py-2.5 text-sm">
              <span>{event.fee === 0 ? "免费参加" : `费用 ¥${event.fee} / 人`}</span>
              <span className="text-[color:var(--clay)]">
                {event.deposit > 0 ? `定金 ¥${event.deposit}（不可退）` : "无需定金"}
              </span>
            </div>
          </div>
        </div>

        <Section title="活动日程">
          <ol className="space-y-3">
            {event.agenda.map((a, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="w-12 shrink-0 tabular-nums text-muted-foreground">{a.time}</span>
                <span className="relative border-l border-border pl-4">
                  <span className="absolute -left-[3px] top-1.5 size-1.5 rounded-full bg-[color:var(--sprout)]" />
                  {a.text}
                </span>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="组织者">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-lg">
              {event.host.avatar}
            </span>
            <div className="min-w-0">
              <p className="text-sm">
                {event.host.name}
                <span className="ml-2 text-xs text-muted-foreground">
                  {event.host.city} · 组织 {event.host.hosted} 场 · 评分 {event.host.rating}
                </span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{event.host.bio}</p>
            </div>
          </div>
        </Section>

        <Section title={`参与者 ${event.joined}/${event.limit}`}>
          <ul className="space-y-2.5">
            {event.attendees.map((a, i) => (
              <li key={i} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary">
                  {a.avatar}
                </span>
                <span className="min-w-0 text-sm">
                  {a.name}
                  <span className="ml-2 text-xs text-muted-foreground">{a.note}</span>
                </span>
              </li>
            ))}
            {Array.from({ length: Math.max(0, event.limit - event.joined) }).map((_, i) => (
              <li key={`slot-${i}`} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="grid size-9 place-items-center rounded-full border border-dashed border-border">
                  +
                </span>
                虚位以待
              </li>
            ))}
          </ul>
        </Section>

        <Section title="报名条件">
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b}
                className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
              >
                <ShieldCheck className="size-3.5 text-[color:var(--sprout)]" />
                {b}
              </span>
            ))}
          </div>
        </Section>

        <div ref={chatRef} className="scroll-mt-4">
        <Section title="临时群聊">
          {isPrivate && !joined && !isHost ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="size-4" /> 私密活动室，输入密码报名后自动进入群聊
            </p>
          ) : !room?.unlocked ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="size-4" /> 有 1 人报名后自动解锁
            </p>
          ) : (
            <div className="space-y-3">
              <p className="rounded-lg bg-secondary/70 px-3 py-2 text-xs text-muted-foreground">
                活动结束 {DISSOLVE_HOURS_AFTER_END} 小时后本群自动解散，聊天记录不再保留。
              </p>
              <ul className="space-y-3">
                {room.messages.length === 0 && (
                  <li className="text-sm text-muted-foreground">还没有人说话，来打个招呼吧。</li>
                )}
                {room.messages.map((m, i) => (
                  <li key={i} className="grid grid-cols-[auto_minmax(0,1fr)] gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-sm">
                      {m.avatar}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {m.name} · {m.time}
                      </p>
                      <p className="mt-0.5 text-sm">{m.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {joined ? (
                <div className="flex items-center gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void doSend()}
                    placeholder={`以 ${profile?.nickname ?? "我"} 的身份发言`}
                    className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary"
                  />
                  <Button size="icon" className="shrink-0 rounded-full" onClick={() => void doSend()}>
                    <Send className="size-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">报名后即可在群里发言。</p>
              )}
            </div>
          )}
        </Section>
        </div>
      </div>

      {/* 移动端固定底部操作条 */}
      <div className="fixed inset-x-0 bottom-[57px] z-30 border-t border-border bg-background/95 px-5 py-3 backdrop-blur md:bottom-0">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0 text-xs text-muted-foreground">
            <p className="truncate">
              {event.fee === 0 ? "免费" : `¥${event.fee}`} ·{" "}
              {event.deposit > 0 ? `含 ¥${event.deposit} 不退定金` : "无定金"}
            </p>
            <p className="truncate">开始前 {CANCEL_LOCK_HOURS} 小时内不可取消</p>
          </div>
          {ended ? (
            <Button disabled className="rounded-full px-8">
              ���动已结束
            </Button>
          ) : joined ? (
            <Button
              variant="outline"
              className="rounded-full px-8"
              onClick={() => setConfirmCancel(true)}
            >
              取消报名
            </Button>
          ) : (
            <Button disabled={full} className="rounded-full px-8" onClick={startJoin}>
              {full ? "已满员" : isPrivate ? "报名加入（需密码）" : "立即报名"}
            </Button>
          )}
        </div>
      </div>

      {/* 新用户注册提示 */}
      <Dialog open={askRegister} onOpenChange={setAskRegister}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>未注册</DialogTitle>
            <DialogDescription>
              您还没有注册账户，需要先完成注册才能参加活动。点击下方按钮进入注册页面。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setAskRegister(false)}>
              返回
            </Button>
            <Button onClick={() => window.location.href = "/profile"}>
              前往注册
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={askPassword} onOpenChange={setAskPassword}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-4" /> 输入活动室密码
            </DialogTitle>
            <DialogDescription>
              这是一场私密活动室，请输入组织者发给你的密码。验证通过后将直接报名并进入临时群。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={password}
              autoFocus
              inputMode="text"
              placeholder="活动室密码"
              onChange={(e) => {
                setPassword(e.target.value);
                setPwError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && void submitPassword()}
            />
            {pwError && <p className="text-xs text-destructive">{pwError}</p>}
            <p className="text-xs text-muted-foreground">
              · 费用 {event.fee === 0 ? "免费" : `¥${event.fee}`}
              {event.deposit > 0 ? ` · 含 ¥${event.deposit} 不退定金` : ""} · 开始前{" "}
              {CANCEL_LOCK_HOURS} 小时内不可取消
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setAskPassword(false)}>
              取消
            </Button>
            <Button onClick={() => void submitPassword()}>验证并加入</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={confirmJoin} onOpenChange={setConfirmJoin}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>确认报名</DialogTitle>
            <DialogDescription>
              {fmtDate(event.startsAt)} {fmtTime(event.startsAt)} · {event.location}
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>· 费用 {event.fee === 0 ? "免费" : `¥${event.fee}`}</li>
            <li>
              · {event.deposit > 0 ? `需支付不可退定金 ¥${event.deposit}` : "本场无需定金"}
            </li>
            <li>· 活动开始前 {CANCEL_LOCK_HOURS} 小时内不可取消</li>
            <li>· 报名后进入临时群，活动结束 {DISSOLVE_HOURS_AFTER_END} 小时后解散</li>
          </ul>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setConfirmJoin(false)}>
              再看看
            </Button>
            <Button onClick={() => void doJoin()}>同意并报名</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{cancellable ? "取消报名？" : "现在无法取消"}</DialogTitle>
            <DialogDescription>
              {cancellable
                ? `取消后名额将释放给他人${event.deposit > 0 ? `，已支付的 ¥${event.deposit} 定金不予退还` : ""}。`
                : `距离活动开始不足 ${CANCEL_LOCK_HOURS} 小时，按规则不可取消。如确有急事请在群内告知组织者。`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
              返回
            </Button>
            {cancellable && (
              <Button variant="destructive" onClick={() => void doCancel()}>
                确认取消
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
