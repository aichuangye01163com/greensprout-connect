import { useState } from "react";
import { Copy, Link2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildInviteLink } from "@/services/activities";
import type { GSEvent } from "@/data/greensprout";

/** 私密活动室的定向邀请卡片：链接 + 密码 + 一键复制 */
export function InviteCard({ event }: { event: GSEvent }) {
  const [link] = useState(() => buildInviteLink(event));
  const password = event.roomPassword ?? "";

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label}已复制`);
    } catch {
      toast.error("复制失败，请长按手动复制");
    }
  };

  const shareText = `【绿芽局】邀请你参加私密活动室「${event.title}」\n链接：${link}\n活动室密码：${password}\n打开链接 → 点击「报名加入」→ 输入密码即可进入临时群。`;

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-[color:var(--sprout)] bg-secondary/50 p-4">
      <p className="text-sm">定向邀请卡片</p>
      <div className="space-y-2 text-xs text-muted-foreground">
        <p className="flex items-start gap-2 break-all">
          <Link2 className="mt-0.5 size-3.5 shrink-0" />
          {link}
        </p>
        <p className="flex items-center gap-2">
          <KeyRound className="size-3.5 shrink-0" />
          活动室密码：<span className="tracking-[0.2em] text-foreground">{password || "未设置"}</span>
        </p>
        <p>把链接与密码一起发给想邀请的人；对方打开后点「报名加入」，输入密码即可直接进入临时群。</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="rounded-full" onClick={() => void copy(link, "邀请链接")}>
          <Copy className="size-3.5" /> 复制链接
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full"
          onClick={() => void copy(password, "活动室密码")}
        >
          复制密码
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full"
          onClick={() => void copy(shareText, "邀请文案")}
        >
          复制邀请文案
        </Button>
      </div>
    </div>
  );
}
