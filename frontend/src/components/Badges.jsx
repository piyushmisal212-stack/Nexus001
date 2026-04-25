import React from "react";

export const StatusBadge = ({ status }) => {
  const map = {
    Pending: "pill-amber",
    Overdue: "pill-red",
    Paid: "pill-green",
  };
  return <span className={`pill ${map[status] || "pill-gray"}`} data-testid={`status-badge-${status}`}>{status}</span>;
};

export const CategoryBadge = ({ category }) => {
  const map = {
    LOAN: "pill-blue",
    SHARED: "pill-purple",
    PROJECT: "pill-amber",
    FOOD: "pill-green",
    TRAVEL: "pill-red",
  };
  return <span className={`pill ${map[category] || "pill-gray"}`}>{category}</span>;
};

export const Avatar = ({ color = "#3b82f6", initials = "?", size = 40 }) => (
  <div
    className="flex items-center justify-center font-semibold text-white shrink-0"
    style={{
      width: size, height: size, borderRadius: 12,
      background: `linear-gradient(135deg, ${color}, ${color}aa)`,
      boxShadow: `0 0 0 1px ${color}30`,
      fontSize: size * 0.38,
      letterSpacing: '0.02em',
    }}
  >{initials}</div>
);
