"use client";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartPoint } from "@workspace/api-client-react";
import { useI18n } from "@/components/i18n";

export const PALETTE = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export function TrendArea({ points, color = "hsl(var(--chart-1))", height = 240, short = false }: { points: ChartPoint[]; color?: string; height?: number; short?: boolean }) {
  const { money, lang } = useI18n();
  const id = `g${color.replace(/[^a-z0-9]/gi, "")}`;
  const fmt = (d: string) => {
    const dt = new Date(d);
    return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG-u-nu-latn" : "en-US", short ? { hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric" }).format(dt);
  };
  return (
    <div style={{ height }} dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 11, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} minTickGap={30} />
          <YAxis domain={["auto", "auto"]} width={56} tickFormatter={(v: number) => money(v).replace(/\.\d+$/, "")} tick={{ fontSize: 11, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 16, border: "2px solid hsl(var(--border))", background: "hsl(var(--card))", fontWeight: 800 }}
            labelFormatter={(l) => fmt(String(l))}
            formatter={(v) => [money(Number(v)), ""]}
          />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={3.5} fill={`url(#${id})`} dot={false} activeDot={{ r: 6, strokeWidth: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AllocationDonut({ data, height = 220 }: { data: { name: string; value: number }[]; height?: number }) {
  const { money } = useI18n();
  return (
    <div style={{ height }} dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="92%" paddingAngle={3} stroke="hsl(var(--card))" strokeWidth={4} cornerRadius={8}>
            {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 16, border: "2px solid hsl(var(--border))", background: "hsl(var(--card))", fontWeight: 800 }} formatter={(v) => money(Number(v))} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
