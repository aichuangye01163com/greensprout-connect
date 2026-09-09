import { useEffect, useState } from "react";

function diffText(target: number) {
  const ms = target - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d} 天 ${h % 24} 小时后开始`;
  }
  return `${h} 小时 ${String(m).padStart(2, "0")} 分 ${String(s).padStart(2, "0")} 秒后开始`;
}

/** 距开始时间的倒计时；仅在客户端渲染，避免水合不一致 */
export function Countdown({ iso, ended }: { iso: string; ended?: boolean }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const target = new Date(iso).getTime();
    const tick = () => setText(diffText(target));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [iso]);

  if (ended) return <span className="text-muted-foreground">活动已结束 · 临时群 12 小时后解散</span>;
  if (!text) return <span className="text-muted-foreground">进行中 / 已开始</span>;
  return <span className="tabular-nums text-[color:var(--sprout)]">{text}</span>;
}

/** 12 小时内不可取消提示所需：是否处于开始前 2 小时内 */
export function useWithinTwoHours(iso: string) {
  const [within, setWithin] = useState(false);
  useEffect(() => {
    const check = () => {
      const ms = new Date(iso).getTime() - Date.now();
      setWithin(ms < 2 * 3600000);
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, [iso]);
  return within;
}
