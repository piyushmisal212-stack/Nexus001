import React, { useEffect, useMemo, useState } from "react";
import api from "../api";
import { Avatar, CategoryBadge, StatusBadge } from "../components/Badges";
import AddTransactionModal from "../components/AddTransactionModal";
import QRModal from "../components/QRModal";
import SendNudgeModal from "../components/SendNudgeModal";
import { Button } from "../components/ui/button";
import { Plus, MessageCircle, Mail, QrCode, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TABS = ["All", "Pending", "Overdue", "Paid"];
const CATS = ["All", "LOAN", "SHARED", "PROJECT", "FOOD", "TRAVEL"];

export default function Transactions() {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("All");
  const [cat, setCat] = useState("All");
  const [addOpen, setAddOpen] = useState(false);
  const [qrFor, setQrFor] = useState(null);
  const [nudge, setNudge] = useState({ open: false, txn: null, channel: "whatsapp" });

  const load = async () => {
    const r = await api.get("/transactions");
    setItems(r.data);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() =>
    items.filter(t => (tab === "All" || t.status === tab) && (cat === "All" || t.category === cat))
  , [items, tab, cat]);

  const markPaid = async (t) => {
    try {
      await api.put(`/transactions/${t.id}`, { status: "Paid" });
      toast.success("Marked as paid");
      load();
    } catch (e) { toast.error("Failed"); }
  };
  const del = async (t) => {
    if (!window.confirm(`Delete ${t.borrower_name}'s transaction?`)) return;
    await api.delete(`/transactions/${t.id}`);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-6" data-testid="transactions-page">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Transactions</h1>
          <p className="text-sm text-[#888] mt-1">All your informal loans, in one place.</p>
        </div>
        <Button onClick={()=>setAddOpen(true)} className="btn-accent" data-testid="add-txn-btn"><Plus size={16} className="mr-1"/>Add</Button>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 p-1 rounded-2xl card" data-testid="status-tabs">
          {TABS.map((t) => (
            <button key={t} onClick={()=>setTab(t)} data-testid={`tab-${t.toLowerCase()}`}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${tab===t ? "bg-[#1a1a1a] text-white" : "text-[#888] hover:text-white"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-2xl card overflow-x-auto" data-testid="category-tabs">
          {CATS.map((c) => (
            <button key={c} onClick={()=>setCat(c)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${cat===c ? "bg-[#1a1a1a] text-white" : "text-[#888] hover:text-white"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden" data-testid="transactions-list">
        {filtered.length === 0 && <div className="p-12 text-center text-[#666] text-sm">Nothing here yet.</div>}
        {filtered.map((t) => (
          <div key={t.id} className="border-b last:border-0 px-4 py-4 flex items-center gap-3 flex-wrap" style={{ borderColor: "#1a1a1a" }} data-testid={`txn-row-${t.id}`}>
            <Avatar color={t.avatar_color} initials={t.initials} />
            <div className="min-w-[140px] flex-1">
              <div className="text-sm font-semibold">{t.borrower_name}</div>
              <div className="text-xs text-[#666]">{t.borrower_phone}{t.borrower_email ? ` · ${t.borrower_email}` : ""}</div>
            </div>
            <CategoryBadge category={t.category} />
            <div className="text-sm font-semibold tabnum w-24 text-right">₹{Number(t.amount).toLocaleString("en-IN")}</div>
            <div className="text-xs text-[#888] tabnum w-24 text-right hidden sm:block">{t.due_date}</div>
            <StatusBadge status={t.status} />
            <div className="flex gap-1.5 ml-auto">
              <IconBtn label="WhatsApp" testid={`btn-wa-${t.id}`} onClick={()=>setNudge({ open: true, txn: t, channel: "whatsapp" })}><MessageCircle size={14}/></IconBtn>
              <IconBtn label="Email" testid={`btn-email-${t.id}`} onClick={()=>setNudge({ open: true, txn: t, channel: "email" })}><Mail size={14}/></IconBtn>
              <IconBtn label="QR" testid={`btn-qr-${t.id}`} onClick={()=>setQrFor(t.id)}><QrCode size={14}/></IconBtn>
              {t.status !== "Paid" && (
                <IconBtn label="Mark paid" color="#22c55e" testid={`btn-paid-${t.id}`} onClick={()=>markPaid(t)}><Check size={14}/></IconBtn>
              )}
              <IconBtn label="Delete" color="#ef4444" testid={`btn-del-${t.id}`} onClick={()=>del(t)}><Trash2 size={14}/></IconBtn>
            </div>
          </div>
        ))}
      </div>

      <AddTransactionModal open={addOpen} onOpenChange={setAddOpen} onCreated={load} />
      <QRModal open={!!qrFor} onOpenChange={(v) => !v && setQrFor(null)} transactionId={qrFor} />
      <SendNudgeModal
        open={nudge.open}
        onOpenChange={(v)=>setNudge((n)=>({...n, open: v}))}
        transaction={nudge.txn}
        channel={nudge.channel}
        onSent={load}
      />
    </div>
  );
}

function IconBtn({ children, onClick, color = "#bbb", label, testid }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} data-testid={testid}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0f0f0f] hover:bg-[#181818] border border-[#1f1f1f] transition"
            style={{ color }}>{children}</button>
  );
}
