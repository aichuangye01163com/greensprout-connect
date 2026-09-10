import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/gs/AppShell";
import { Chip } from "@/components/gs/Chip";
import { useGS } from "@/lib/gs-store";
import {
  CATEGORIES,
  EDUCATION_LEVELS,
  INCOME_TIERS,
  type CategoryId,
  type GSEvent,
} from "@/data/greensprout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "发起活动 · 绿芽局 GreenSprout" },
      { name: "description", content: "用快捷模板或自定义方式，三分钟发起一场同城小型活动。" },
      { property: "og:title", content: "发起活动 · 绿芽局 GreenSprout" },
      { property: "og:description", content: "快捷模板 + 自定义配置，三分钟开局。" },
    ],
  }),
  component: CreateEvent,
});

function isoLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function CreateEvent() {
  const { createEvent, profile } = useGS();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0);

  const [category, setCategory] = useState<CategoryId>("coffee");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [district, setDistrict] = useState("徐汇");
  const [start, setStart] = useState(isoLocal(tomorrow));
  const [end, setEnd] = useState(isoLocal(new Date(tomorrow.getTime() + 2 * 3600000)));
  const [limit, setLimit] = useState(6);
  const [agenda, setAgenda] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [fee, setFee] = useState(0);
  const [depositOn, setDepositOn] = useState(false);
  const [deposit, setDeposit] = useState(30);
  const [ageMin, setAgeMin] = useState(20);
  const [ageMax, setAgeMax] = useState(40);
  const [gender, setGender] = useState<"不限" | "仅限女生" | "仅限男生">("不限");
  const [education, setEducation] = useState("不限");
  const [income, setIncome] = useState("不限");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [roomPassword, setRoomPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const applyTemplate = (id: CategoryId) => {
    const t = CATEGORIES.find((c) => c.id === id)!;
    const s = new Date(start);
    setCategory(id);
    setTitle(`${t.label}小局 · ${t.defaultLimit} 人`);
    setLimit(t.defaultLimit);
    setTags(t.defaultTags);
    setFee(t.defaultFee);
    setDeposit(t.defaultDeposit);
    setDepositOn(t.defaultDeposit > 0);
    setAgenda(t.defaultAgenda);
    setGender(id === "women" ? "仅限女生" : "不限");
    setEnd(isoLocal(new Date(s.getTime() + t.defaultDurationHours * 3600000)));
    setStep(2);
  };

  const submit = async () => {
    if (!title.trim() || !location.trim()) {
      toast.error("请填写活动标题和地点");
      return;
    }
    if (isPrivate && roomPassword.trim().length < 4) {
      toast.error("请为私密活动室设置至少 4 位密码");
      return;
    }
    setSubmitting(true);
    const t = CATEGORIES.find((c) => c.id === category)!;
    const startHour = new Date(start).getHours();
    const host: GSEvent["host"] = {
      name: profile?.nickname ?? "我",
      avatar: profile?.avatar ?? "🌱",
      city: profile?.city ?? "上海",
      hosted: 1,
      rating: 5,
      bio: profile?.career ?? "新晋组织者",
    };
    const created = await createEvent({
      title: title.trim(),
      category,
      cover: t.cover,
      startsAt: new Date(start).toISOString(),
      endsAt: new Date(end).toISOString(),
      location: location.trim(),
      district,
      limit,
      tags,
      fee,
      deposit: depositOn ? deposit : 0,
      agenda: (agenda.length ? agenda : t.defaultAgenda).map((text, i) => ({
        time: `${String(startHour + i).padStart(2, "0")}:00`,
        text,
      })),
      eligibility: {
        ageRange: [ageMin, ageMax],
        gender,
        education,
        income,
      },
      description: description.trim() || "组织者还没有写介绍，直接来就好。",
      host,
      ...(isPrivate ? { isPrivate: true, roomPassword: roomPassword.trim() } : {}),
    });
    setSubmitting(false);
    toast.success(isPrivate ? "私密活动室已创建，去复制邀请链接" : "活动已发布");
    void navigate({ to: "/event/$id", params: { id: created.id } });
  };

  return (
    <AppShell>
      <div className="space-y-6 pb-24">
        <header className="space-y-1">
          <h1 className="text-xl tracking-tight">发起一场活动</h1>
          <p className="text-sm text-muted-foreground">
            {step === 1 ? "先选一个快捷模板，或直接自定义" : "补全细节，随时可以返回换模板"}
          </p>
        </header>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => applyTemplate(c.id)}
                  className="rounded-2xl border border-border bg-card p-4 text-left transition-colors active:bg-secondary"
                >
                  <span className="text-2xl">{c.emoji}</span>
                  <p className="mt-2 text-sm">{c.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.defaultLimit} 人 · {c.defaultDurationHours} 小时 ·{" "}
                    {c.defaultFee === 0 ? "免费" : `¥${c.defaultFee}`}
                  </p>
                </button>
              ))}
            </div>
            <Button variant="outline" className="w-full rounded-xl" onClick={() => setStep(2)}>
              跳过模板，自定义活动
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Card title="活动类型">
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
                    {c.emoji} {c.label}
                  </Chip>
                ))}
              </div>
            </Card>

            <Card title="基本信息">
              <Field label="活动标题">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：安静咖啡局 · 不聊工作" />
              </Field>
              <Field label="地点">
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="例如：永康路 · 拾光咖啡二楼" />
              </Field>
              <Field label="所在区">
                <Input value={district} onChange={(e) => setDistrict(e.target.value)} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="开始时间">
                  <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
                </Field>
                <Field label="结束时间">
                  <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
                </Field>
              </div>
              <Field label={`人数上限：${limit} 人`}>
                <input
                  type="range"
                  min={2}
                  max={20}
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full accent-[color:var(--primary)]"
                />
              </Field>
              <Field label="封面">
                <div className="flex items-center gap-3">
                  <img
                    src={CATEGORIES.find((c) => c.id === category)!.cover}
                    alt="活动封面预览"
                    loading="lazy"
                    width={1024}
                    height={640}
                    className="h-16 w-28 rounded-lg object-cover"
                  />
                  <p className="text-xs text-muted-foreground">按类型自动匹配插画封面，可后续替换</p>
                </div>
              </Field>
            </Card>

            <Card title="日程安排">
              <div className="space-y-2">
                {(agenda.length ? agenda : [""]).map((a, i) => (
                  <Input
                    key={i}
                    value={a}
                    placeholder={`第 ${i + 1} 项，例如：集合与破冰`}
                    onChange={(e) =>
                      setAgenda((prev) => {
                        const next = prev.length ? [...prev] : [""];
                        next[i] = e.target.value;
                        return next;
                      })
                    }
                  />
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setAgenda((p) => [...(p.length ? p : [""]), ""])}
                >
                  + 添加一项
                </Button>
              </div>
            </Card>

            <Card title="费用与定金">
              <Field label="人均费用（元）">
                <Input type="number" value={fee} onChange={(e) => setFee(Number(e.target.value))} />
              </Field>
              <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2.5">
                <span className="text-sm">收取不可退定金</span>
                <Switch checked={depositOn} onCheckedChange={setDepositOn} />
              </div>
              {depositOn && (
                <Field label="定金金额（元，爽约不退）">
                  <Input type="number" value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} />
                </Field>
              )}
            </Card>

            <Card title="私密活动室">
              <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2.5">
                <span className="text-sm">设为私密活动室</span>
                <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
              </div>
              {isPrivate && (
                <>
                  <Field label="活动室密码（分享给被邀请的人）">
                    <Input
                      value={roomPassword}
                      onChange={(e) => setRoomPassword(e.target.value)}
                      placeholder="例如：9527"
                    />
                  </Field>
                  <p className="text-xs text-muted-foreground">
                    私密活动在活动大厅只显示锁标识，需输入密码才能报名。发布后可在详情页复制定向邀请链接。
                  </p>
                </>
              )}
            </Card>

            <Card title="报名条件">
              <div className="grid grid-cols-2 gap-3">
                <Field label="最小年龄">
                  <Input type="number" value={ageMin} onChange={(e) => setAgeMin(Number(e.target.value))} />
                </Field>
                <Field label="最大年龄">
                  <Input type="number" value={ageMax} onChange={(e) => setAgeMax(Number(e.target.value))} />
                </Field>
              </div>
              <Field label="性别">
                <div className="flex flex-wrap gap-2">
                  {(["不限", "仅限女生", "仅限男生"] as const).map((g) => (
                    <Chip key={g} active={gender === g} onClick={() => setGender(g)}>
                      {g}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label="学历要求">
                <div className="flex flex-wrap gap-2">
                  {["不限", ...EDUCATION_LEVELS].map((e) => (
                    <Chip key={e} active={education === e} onClick={() => setEducation(e)}>
                      {e}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label="收入要求">
                <div className="flex flex-wrap gap-2">
                  {["不限", ...INCOME_TIERS].map((i) => (
                    <Chip key={i} active={income === i} onClick={() => setIncome(i)}>
                      {i}
                    </Chip>
                  ))}
                </div>
              </Field>
            </Card>

            <Card title="活动介绍">
              <Textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="说说这场活动的气质、节奏和注意事项"
              />
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(1)}>
                返回模板
              </Button>
              <Button className="flex-1 rounded-xl" disabled={submitting} onClick={() => void submit()}>
                {submitting ? "发布中…" : "发布活动"}
              </Button>
            </div>
          </div>
        )}
      </div>
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
