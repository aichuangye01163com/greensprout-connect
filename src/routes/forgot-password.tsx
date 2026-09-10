import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/gs/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as auth from "@/services/auth";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async () => {
    if (!email.trim()) {
      toast.error("请填写注册邮箱");
      return;
    }
    setSubmitting(true);
    try {
      await auth.requestPasswordReset(email.trim());
      setSent(true);
      toast.success("重置邮件已发送，请查收邮箱");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "发送失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <section className="mx-auto max-w-md space-y-4 rounded-2xl border border-border bg-card p-5">
        <header className="space-y-1">
          <h1 className="text-xl tracking-tight">忘记密码</h1>
          <p className="text-sm text-muted-foreground">
            输入注册邮箱，我们会发送一封重置密码的邮件。
          </p>
        </header>

        {sent ? (
          <div className="space-y-4 py-4 text-center">
            <p className="text-sm text-muted-foreground">
              已向 <span className="text-foreground">{email}</span> 发送重置链接，请查收邮件并点击链接设置新密码。
            </p>
            <Button asChild className="rounded-xl">
              <Link to="/login">返回登录</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email" className="text-xs text-muted-foreground">
                邮箱
              </Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                onKeyDown={(e) => e.key === "Enter" && void onSubmit()}
              />
            </div>

            <Button
              className="w-full rounded-xl"
              disabled={submitting}
              onClick={() => void onSubmit()}
            >
              {submitting ? "发送中…" : "发送重置邮件"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="text-foreground underline underline-offset-2">
                返回登录
              </Link>
            </p>
          </>
        )}
      </section>
    </AppShell>
  );
}
