import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/gs/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGS } from "@/lib/gs-store";
import { toast } from "sonner";
import { ApiError } from "@/services/api-client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { login, profile } = useGS();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!account.trim() || !password.trim()) {
      toast.error("请填写邮箱/手机号和密码");
      return;
    }
    setSubmitting(true);
    try {
      await login({ account: account.trim(), password: password.trim() });
      toast.success("登录成功");
      void navigate({ to: "/profile" });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "登录失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  if (profile) {
    return (
      <AppShell>
        <div className="space-y-4 py-20 text-center">
          <p className="text-sm text-muted-foreground">你已登录。</p>
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
          <h1 className="text-xl tracking-tight">登录账户</h1>
          <p className="text-sm text-muted-foreground">登录后可继续报名、发起活动和进入临时群。</p>
        </header>
        <Field id="login-account" label="邮箱或手机号">
          <Input
            id="login-account"
            value={account}
            inputMode="email"
            onChange={(e) => setAccount(e.target.value)}
            placeholder="you@example.com 或 13800000000"
          />
        </Field>
        <Field id="login-password" label="密码">
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入你的密码"
          />
        </Field>
        <Button className="w-full rounded-xl" disabled={submitting} onClick={() => void submit()}>
          {submitting ? "登录中…" : "立即登录"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          还没有账户？
          <Link to="/profile" className="ml-1 text-foreground underline underline-offset-2">
            去完善资料
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
