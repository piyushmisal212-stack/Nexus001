import React, { useEffect, useState } from "react";
import api from "../api";
import { Avatar } from "../components/Badges";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

const CAT_COLORS = {
  LOAN: "#3b82f6",
  SHARED: "#a855f7",
  PROJECT: "#f59e0b",
  FOOD: "#22c55e",
  TRAVEL: "#ef4444",
};

const trustPill = (s) => {
  if (s >= 80) return { label: "Reliable", c: "#22c55e" };
  if (s >= 50) return { label: "At Risk", c: "#f59e0b" };
  return { label: "High Risk", c: "#ef4444" };
};

export default function Insights() {
  const [s, setS] = useState(null);

  useEffect(() => { api.get("/insights/summary").then(r => setS(r.data)); }, []);

  const fmt = (v) => "₹" + Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

  return (
    <div className="space-y-6" data-testid="insights-page">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Insights</h1>
        <p className="text-sm text-[#888] mt-1">Patterns in your lending. Spot risks early.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-6 lg:col-span-1" data-testid="recovery-rate-card">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[#666] font-semibold">Recovery rate</div>
          <div className="mt-3 text-6xl font-black tabnum text-[#22c55e]">{s?.recovery_rate ?? 0}<span className="text-3xl">%</span></div>
          <div className="mt-2 text-xs text-[#888]">{fmt(s?.total_recovered)} recovered of {fmt(s?.total_lent)} lent</div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] p-3">
              <div className="text-xs text-[#888]">Pending</div>
              <div className="font-semibold text-[#f59e0b] tabnum">{fmt(s?.pending)}</div>
            </div>
            <div className="rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] p-3">
              <div className="text-xs text-[#888]">Overdue</div>
              <div className="font-semibold text-[#ef4444] tabnum">{fmt(s?.overdue)}</div>
            </div>
          </div>
        </div>

        <div className="card p-6 lg:col-span-2" data-testid="category-split-card">
          <div className="flex items-baseline justify-between">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#666] font-semibold">Category split</div>
            <div className="text-xs text-[#888]">Total {fmt(s?.total_lent)}</div>
          </div>
          {s?.category_split?.length ? (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-4 items-center">
              <div style={{ width: "100%", height: 220, minHeight: 220 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={s.category_split} dataKey="value" nameKey="name" innerRadius={56} outerRadius={92} paddingAngle={3}>
                      {s.category_split.map((c) => (
                        <Cell key={c.name} fill={CAT_COLORS[c.name] || "#888"} stroke="#0a0a0a" strokeWidth={2}/>
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#0c0c0c", border: "1px solid #222", borderRadius: 12, color: "#fff" }} formatter={(v) => fmt(v)}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {s.category_split.map(c => (
                  <div key={c.name} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-sm" style={{ background: CAT_COLORS[c.name] }} />
                    <span className="text-[#bbb] flex-1">{c.name}</span>
                    <span className="font-semibold tabnum">{fmt(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="py-12 text-center text-[#666] text-sm">No data yet</div>}
        </div>
      </div>

      <div className="card p-6" data-testid="monthly-trend-card">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#666] font-semibold">Monthly trend (last 6 months)</div>
        {(s?.monthly_trend || []).some(m => m.lent || m.recovered) ? (
          <div className="mt-3" style={{ width: "100%", height: 280, minHeight: 280 }}>
            <ResponsiveContainer>
              <BarChart data={s?.monthly_trend || []}>
                <CartesianGrid stroke="#1a1a1a" strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="month" stroke="#666" tickLine={false} axisLine={false}/>
                <YAxis stroke="#666" tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${v/1000}k` : v}/>
                <Tooltip contentStyle={{ background: "#0c0c0c", border: "1px solid #222", borderRadius: 12, color: "#fff" }} formatter={(v) => fmt(v)}/>
                <Legend wrapperStyle={{ color: "#888", fontSize: 12 }}/>
                <Bar dataKey="lent" fill="#3b82f6" radius={[6,6,0,0]} />
                <Bar dataKey="recovered" fill="#22c55e" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-10 text-center text-[#666] text-sm">No activity yet</div>
        )}
      </div>

      <div className="card p-6" data-testid="top-borrowers-card">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#666] font-semibold">Top borrowers</div>
        <div className="mt-3 divide-y divide-[#1a1a1a]">
          {(s?.top_borrowers || []).length === 0 && <div className="py-8 text-center text-[#666] text-sm">No borrowers yet</div>}
          {(s?.top_borrowers || []).map((b, i) => {
            const tp = trustPill(b.trust_score);
            return (
              <div key={`${b.name}-${i}`} className="flex items-center gap-3 py-3">
                <div className="text-xs text-[#666] w-6 tabnum">#{i+1}</div>
                <Avatar color={b.avatar_color || "#3b82f6"} initials={b.initials || b.name?.[0]?.toUpperCase() || "?"} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{b.name}</div>
                  <div className="text-xs text-[#666]">{b.phone}</div>
                </div>
                <span className="pill" style={{ background: `${tp.c}22`, color: tp.c }}>{b.trust_score} · {tp.label}</span>
                <div className="text-sm font-semibold tabnum w-24 text-right">{fmt(b.owed)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
