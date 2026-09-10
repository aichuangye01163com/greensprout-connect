import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/gs/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGS } from "@/lib/gs-store";
import { toast } from "sonner";
import * as auth from "@/services/auth";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { profile, setAuthSession } = useGS();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      toast.error("请填写邮箱、密码和确认密码");
      return;
    }
    if (password.length < 6) {
      toast.error("密码至少 6 位");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }
    setSubmitting(true);
    try {
      const { needsEmailConfirmation } = await auth.signUp({
        email: email.trim(),
        password,
        nickname: nickname.trim() || undefined,
      });

      if (needsEmailConfirmation) {
        toast.success("注册成功！请查收邮箱并点击验证链接后再登录。");
        void navigate({ to: "/login" });
      } else {
        // 若项目未强制邮箱确认，直接拿到 session
        const session = await auth.getSession();
        if (session) setAuthSession(session);
        toast.success("注册成功");
        void navigate({ to: "/profile" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "注册失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  if (profile) {
    return (
      <AppShell>
        <div className="space-y-4 py-20 text-center">
          <p className="text-sm text-muted-foreground">你已登录，无需重复注册。</p>
          <Button asChild className="rounded-xl">
            <Link to="/profile">前往个人资料</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-md space-y-4 rounded-2xl border border-border bg-card p-5">
        <header className="space-y-1">
          <h1 className="text-xl tracking-tight">注册账户</h1>
          <p className="text-sm text-muted-foreground">
            创建账户后即可报名、进群和管理个人资料。注册成功后会发送邮箱验证邮件。
          </p>
        </header>

        <Field id="register-nickname" label="昵称（可选）">
          <Input
            id="register-nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="例如：林小满"
          />
        </Field>

        <Field id="register-email" label="邮箱">
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>

        <Field id="register-password" label="密码">
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 6 位"
          />
        </Field>

        <Field id="register-confirm" label="确认密码">
          <Input
            id="register-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="再次输入密码"
            onKeyDown={(e) => e.key === "Enter" && void submit()}
          />
        </Field>

        <Button className="w-full rounded-xl" disabled={submitting} onClick={() => void submit()}>
          {submitting ? "注册中…" : "立即注册"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          已有账户？
          <Link to="/login" className="ml-1 text-foreground underline underline-offset-2">
            去登录
          </Link>
        </p>
      </section>
    </AppShell>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
