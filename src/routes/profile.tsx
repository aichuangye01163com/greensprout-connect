import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, LogOut } from "lucide-react";
import { AppShell } from "@/components/gs/AppShell";
import { Chip } from "@/components/gs/Chip";
import { EventCard } from "@/components/gs/EventCard";
import { useGS } from "@/lib/gs-store";
import {
  AVATAR_CHOICES,
  EDUCATION_LEVELS,
  GENDERS,
  HOBBY_TAGS,
  INCOME_TIERS,
} from "@/data/greensprout";
import { sendVerificationCode, verifyEmail, type UserProfile } from "@/services/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "个人资料与偏好 · 绿芽局 GreenSprout" },
      { name: "description", content: "完善昵称、城市、兴趣标签与雷区，让同城活动匹配更准确。" },
      { property: "og:title", content: "个人资料与偏好 · 绿芽局 GreenSprout" },
      { property: "og:description", content: "50 个兴趣标签、雷区设置与隐私开关。" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, saveProfile, refresh, events, isJoined, logout } = useGS();
  const [draft, setDraft] = useState<UserProfile | null>(profile);
  const [customTag, setCustomTag] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  useEffect(() => {
    if (profile) setDraft(profile);
  }, [profile]);

  // 获取用户发起的活动（该用户是 host）
  const hostedEvents = useMemo(
    () => events.filter((e) => e.host.name === profile?.nickname && e.status === "open"),
    [events, profile?.nickname],
  );

  // 获取用户参加的活动（已报名 + 非发起者 + 进行中）
  const joinedEvents = useMemo(
    () =>
      events.filter(
        (e) => isJoined(e.id) && e.host.name !== profile?.nickname && e.status === "open",
      ),
    [events, profile?.nickname, isJoined],
  );

  if (!draft) {
    return (
      <AppShell>
        <p className="py-20 text-center text-sm text-muted-foreground">加载中…</p>
      </AppShell>
    );
  }

  const set = <K extends keyof UserProfile>(k: K, v: UserProfile[K]) =>
    setDraft((p) => (p ? { ...p, [k]: v } : p));

  const toggleHobby = (t: string) =>
    set(
      "hobbies",
      draft.hobbies.includes(t) ? draft.hobbies.filter((h) => h !== t) : [...draft.hobbies, t],
    );

  const addCustomTag = () => {
    const t = customTag.trim();
    if (!t) return;
    if (!draft.hobbies.includes(t)) set("hobbies", [...draft.hobbies, t]);
    setCustomTag("");
  };

  const onSendCode = async () => {
    const res = await sendVerificationCode(draft.email);
    setCodeSent(true);
    toast(res.hint);
  };

  const onVerify = async () => {
    try {
      await verifyEmail(code);
      await refresh();
      toast.success("邮箱已验证");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onSave = async () => {
    await saveProfile(draft);
    toast.success("资料已保存");
  };

  const onLogout = () => {
    logout();
  };

  return (
    <AppShell>
      <div className="space-y-4 pb-24">
        <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-accent text-2xl">
            {draft.avatar}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl tracking-tight">{draft.nickname}</h1>
            <p className="truncate text-sm text-muted-foreground">
              {draft.city} · {draft.career}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => setLogoutConfirm(true)}
            title="退出登录"
          >
            <LogOut className="size-5" />
          </Button>
        </header>

        {/* 我的活动部分 */}
        <Card title="我发起的活动">
          {hostedEvents.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">无</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {hostedEvents.map((e) => (
                <EventCard key={e.id} event={e} joined={isJoined(e.id)} />
              ))}
            </div>
          )}
        </Card>

        <Card title="我参加的活动">
          {joinedEvents.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">无</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {joinedEvents.map((e) => (
                <EventCard key={e.id} event={e} joined={isJoined(e.id)} />
              ))}
            </div>
          )}
        </Card>

        <Card title="头像">
          <div className="flex flex-wrap gap-2">
            {AVATAR_CHOICES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => set("avatar", a)}
                className={`grid size-10 place-items-center rounded-full border text-lg ${
                  draft.avatar === a ? "border-primary bg-secondary" : "border-border"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </Card>

        <Card title="基础资料">
          <Field label="昵称">
            <Input value={draft.nickname} onChange={(e) => set("nickname", e.target.value)} />
          </Field>
          <Field label="邮箱">
            <div className="flex gap-2">
              <Input
                className="min-w-0 flex-1"
                value={draft.email}
                onChange={(e) => set("email", e.target.value)}
              />
              <Button variant="outline" className="shrink-0" onClick={() => void onSendCode()}>
                发送验证码
              </Button>
            </div>
            {draft.emailVerified ? (
              <p className="flex items-center gap-1 text-xs text-[color:var(--sprout)]">
                <BadgeCheck className="size-3.5" /> 已验证
              </p>
            ) : (
              codeSent && (
                <div className="flex gap-2">
                  <Input
                    className="min-w-0 flex-1"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="输入验证码（演示：8080）"
                  />
                  <Button className="shrink-0" onClick={() => void onVerify()}>
                    验证
                  </Button>
                </div>
              )
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="年龄">
              <Input
                type="number"
                value={draft.age}
                onChange={(e) => set("age", Number(e.target.value))}
              />
            </Field>
            <Field label="城市 / 常驻地">
              <Input value={draft.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
          </div>
          <Field label="性别">
            <div className="flex flex-wrap gap-2">
              {GENDERS.map((g) => (
                <Chip key={g} active={draft.gender === g} onClick={() => set("gender", g)}>
                  {g}
                </Chip>
              ))}
            </div>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="毕业院校">
              <Input value={draft.university} onChange={(e) => set("university", e.target.value)} />
            </Field>
            <Field label="职业">
              <Input value={draft.career} onChange={(e) => set("career", e.target.value)} />
            </Field>
          </div>
          <Field label="学历">
            <div className="flex flex-wrap gap-2">
              {EDUCATION_LEVELS.map((e) => (
                <Chip key={e} active={draft.education === e} onClick={() => set("education", e)}>
                  {e}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="年收入区间">
            <div className="flex flex-wrap gap-2">
              {INCOME_TIERS.map((i) => (
                <Chip key={i} active={draft.income === i} onClick={() => set("income", i)}>
                  {i}
                </Chip>
              ))}
            </div>
          </Field>
        </Card>

        <Card title={`兴趣标签（已选 ${draft.hobbies.length}）`}>
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set([...HOBBY_TAGS, ...draft.hobbies])).map((t) => (
              <Chip key={t} active={draft.hobbies.includes(t)} onClick={() => toggleHobby(t)}>
                {t}
              </Chip>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              className="min-w-0 flex-1"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomTag()}
              placeholder="添加自定义标签"
            />
            <Button variant="outline" className="shrink-0" onClick={addCustomTag}>
              添加
            </Button>
          </div>
        </Card>

        <Card title="我的雷区">
          <Textarea
            rows={3}
            value={draft.landmines}
            onChange={(e) => set("landmines", e.target.value)}
            placeholder="写下你不能接受的行为，报名双方都能看到"
          />
        </Card>

        <Card title="隐私设置">
          <Row
            label="公开我喜欢的活动"
            checked={draft.showLiked}
            onChange={(v) => set("showLiked", v)}
          />
          <Row
            label="公开我发起的活动"
            checked={draft.showHosted}
            onChange={(v) => set("showHosted", v)}
          />
        </Card>

        <Button className="w-full rounded-xl" onClick={() => void onSave()}>
          保存资料
        </Button>
      </div>

      <Dialog open={logoutConfirm} onOpenChange={setLogoutConfirm}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>确认退出登录？</DialogTitle>
            <DialogDescription>退出后将返回首页，下次访问可重新登录账号。</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setLogoutConfirm(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={onLogout}>
              确认退出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Row({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2.5">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
