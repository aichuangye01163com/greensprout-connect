```tsx
import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { AppShell } from "@/components/gs/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import * as auth from "@/services/auth";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checking, setChecking] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkCurrentSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session?.user) {
        setRecoveryReady(true);
      }

      setChecking(false);
    };

    void checkCurrentSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY" && session?.user) {
        setRecoveryReady(true);
        setChecking(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async () => {
    if (!recoveryReady) {
      toast.error("重置链接无效或已失效，请重新获取密码重置邮件");
      return;
    }

    if (!password || !confirmPassword) {
      toast.error("请输入新密码和确认密码");
      return;
    }

    if (password.length < 6) {
      toast.error("密码至少需要 6 位");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    setSubmitting(true);

    try {
      await auth.updatePassword(password);

      toast.success("密码修改成功，请使用新密码登录");

      await supabase.auth.signOut();

      void navigate({
        to: "/login",
      });
    } catch (error) {
      console.error("[reset-password] update password error", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "密码修改失败，请重新获取密码重置邮件",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <section className="mx-auto w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-6">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">
            设置新密码
          </h1>

          <p className="text-sm text-muted-foreground">
            {checking
              ? "正在验证密码重置链接…"
              : recoveryReady
                ? "请输入你的新密码。"
                : "重置链接无效或已失效，请重新获取密码重置邮件。"}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">新密码</Label>

            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="至少 6 位"
              disabled={checking || !recoveryReady || submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">确认新密码</Label>

            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              placeholder="再次输入新密码"
              disabled={checking || !recoveryReady || submitting}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleSubmit();
                }
              }}
            />
          </div>

          <Button
            type="button"
            className="w-full rounded-xl"
            disabled={checking || !recoveryReady || submitting}
            onClick={() => void handleSubmit()}
          >
            {checking
              ? "验证链接中…"
              : submitting
                ? "保存中…"
                : "保存新密码"}
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <Link
            to="/login"
            className="text-foreground underline underline-offset-2"
          >
            返回登录
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
```
