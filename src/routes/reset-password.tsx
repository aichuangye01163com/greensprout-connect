import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/gs/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as auth from "@/services/auth";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!password || !confirm) {
      toast.error("请填写新密码和确认密码");
      return;
    }
    if (password.length < 6) {
      toast.error("密码至少 6 位");
      return;
    }
    if (password !== confirm) {
      toast.error("两次输入的密码不一致");
      return;
    }
    setSubmitting(true);
    try {
      await auth.updatePassword(password);
      toast.success("密码已更新，请使用新密码登录");
      void navigate({ to: "/login" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "重置失败，请重新从邮件链接进入");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <section className="mx-auto max-w-md space-y-4 rounded-2xl border border-border bg-card p-5">
        <header className="space-y-1">
          <h1 className="text-xl tracking-tight">设置新密码</h1>
          <p className="text-sm text-muted-foreground">
            请输入新密码。此页面通常从重置邮件链接进入。
          </p>
        </header>

        <div className="space-y-1.5">
          <Label htmlFor="new-password" className="text-xs text-muted-foreground">
            新密码
          </Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 6 位"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-password" className="text-xs text-muted-foreground">
            确认新密码
          </Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="再次输入新密码"
            onKeyDown={(e) => e.key === "Enter" && void onSubmit()}
          />
        </div>

        <Button className="w-full rounded-xl" disabled={submitting} onClick={() => void onSubmit()}>
          {submitting ? "保存中…" : "保存新密码"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-foreground underline underline-offset-2">
            返回登录
          </Link>
        </p>
      </section>
    </AppShell>
  );
}
