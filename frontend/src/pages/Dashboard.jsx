import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import StatCard from "../components/StatCard";
import { Avatar, CategoryBadge, StatusBadge } from "../components/Badges";
import AddTransactionModal from "../components/AddTransactionModal";
import { TrendingUp, ArrowDownToLine, Clock, AlertOctagon, Plus, Megaphone, BarChart3 } from "lucide-react";

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    const [s, t] = await Promise.all([
      api.get("/insights/summary"),
      api.get("/transactions"),
    ]);
    setSummary(s.data);
    setRecent(t.data.slice(0, 5));
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-7" data-testid="dashboard-page">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] tracking-[0.3em] uppercase text-[#666] font-semibold">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mt-1 tracking-tight">
            {greet()}, <span className="text-[#3b82f6]">{(user?.name || "").split(" ")[0] || "there"}</span> <span className="ml-1">👋</span>
          </h1>
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-accent px-4 py-2.5 rounded-xl flex items-center gap-2" data-testid="header-add-txn">
          <Plus size={16}/> Add transaction
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total lent out" value={summary?.total_lent} color="#3b82f6" icon={TrendingUp} testid="stat-lent"/>
        <StatCard label="Total recovered" value={summary?.total_recovered} color="#22c55e" icon={ArrowDownToLine} testid="stat-recovered"/>
        <StatCard label="Pending" value={summary?.pending} color="#f59e0b" icon={Clock} testid="stat-pending"/>
        <StatCard label="Overdue" value={summary?.overdue} color="#ef4444" icon={AlertOctagon} testid="stat-overdue"/>
      </div>

      <div className="card p-5" data-testid="recent-transactions">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent transactions</h2>
          <button onClick={()=>navigate("/transactions")} className="text-xs text-[#888] hover:text-white">View all →</button>
        </div>
        <div className="mt-3 divide-y divide-[#1a1a1a]">
          {recent.length === 0 && (
            <div className="py-10 text-center text-[#666] text-sm">No transactions yet. Add your first one ↑</div>
          )}
          {recent.map((t) => (
            <div key={t.id} className="flex items-center gap-3 py-3" data-testid={`recent-row-${t.id}`}>
              <Avatar color={t.avatar_color} initials={t.initials} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{t.borrower_name}</div>
                <div className="text-xs text-[#666] truncate">{t.borrower_phone}</div>
              </div>
              <CategoryBadge category={t.category} />
              <div className="text-sm font-semibold tabnum w-20 text-right">₹{Number(t.amount).toLocaleString("en-IN")}</div>
              <StatusBadge status={t.status} />
              <div className="hidden sm:block text-xs text-[#666] tabnum w-24 text-right">{t.due_date}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button onClick={()=>setAddOpen(true)} data-testid="quick-add" className="card p-5 text-left hover:bg-[#141414] transition flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#3b82f622] flex items-center justify-center text-[#3b82f6]"><Plus size={18}/></span>
          <div>
            <div className="text-sm font-semibold">Add transaction</div>
            <div className="text-xs text-[#888]">Log a new informal loan</div>
          </div>
        </button>
        <button onClick={()=>navigate("/nudge")} data-testid="quick-nudge" className="card p-5 text-left hover:bg-[#141414] transition flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#f59e0b22] flex items-center justify-center text-[#f59e0b]"><Megaphone size={18}/></span>
          <div>
            <div className="text-sm font-semibold">Nudge Center</div>
            <div className="text-xs text-[#888]">Auto-escalating reminders</div>
          </div>
        </button>
        <button onClick={()=>navigate("/insights")} data-testid="quick-insights" className="card p-5 text-left hover:bg-[#141414] transition flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#22c55e22] flex items-center justify-center text-[#22c55e]"><BarChart3 size={18}/></span>
          <div>
            <div className="text-sm font-semibold">Insights</div>
            <div className="text-xs text-[#888]">Recovery rate & trends</div>
          </div>
        </button>
      </div>

      <AddTransactionModal open={addOpen} onOpenChange={setAddOpen} onCreated={() => load()} />
    </div>
  );
}
