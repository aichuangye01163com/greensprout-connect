import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/gs/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useGS } from "@/lib/gs-store";
import * as auth from "@/services/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { profile, setAuthSession } = useGS();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      toast.error("请填写邮箱和密码");
      return;
    }
    setSubmitting(true);
    try {
      const session = await auth.signIn({
        email: email.trim(),
        password,
      });
      setAuthSession(session);
      toast.success("登录成功");
      void navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "登录失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  if (profile) {
    return (
      <AppShell>
        <div className="space-y-4 py-20 text-center">
          <p className="text-sm text-muted-foreground">你已登录，无需重复登录。</p>
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
          <h1 className="text-xl tracking-tight">登录</h1>
          <p className="text-sm text-muted-foreground">使用邮箱和密码登录绿芽局。</p>
        </header>

        <Alert className="border-border/70 bg-background/70">
          <AlertDescription className="text-muted-foreground">
            使用 Supabase Authentication，密码由 Supabase 安全托管，前端不保存密码。
          </AlertDescription>
        </Alert>

        <div className="space-y-1.5">
          <Label htmlFor="login-email" className="text-xs text-muted-foreground">
            邮箱
          </Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="login-password" className="text-xs text-muted-foreground">
            密码
          </Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            onKeyDown={(e) => e.key === "Enter" && void onSubmit()}
          />
        </div>

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            忘记密码？
          </Link>
        </div>

        <Button className="w-full rounded-xl" disabled={submitting} onClick={() => void onSubmit()}>
          {submitting ? "登录中…" : "立即登录"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          还没有账户？
          <Link to="/register" className="ml-1 text-foreground underline underline-offset-2">
            去注册
          </Link>
        </p>
      </section>
    </AppShell>
  );
}
