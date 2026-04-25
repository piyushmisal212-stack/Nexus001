import React from "react";

const fmt = (v) => "₹" + Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function StatCard({ label, value, color = "#3b82f6", icon: Icon, sub, testid }) {
  return (
    <div
      className="card p-5 relative stat-glow overflow-hidden"
      style={{ "--glow-color": color }}
      data-testid={testid}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[#777] font-semibold">{label}</div>
          <div className="mt-2 text-3xl font-extrabold tabnum" style={{ color }}>{fmt(value)}</div>
          {sub && <div className="mt-1 text-xs text-[#888]">{sub}</div>}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: `${color}1a`, color }}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  );
}
