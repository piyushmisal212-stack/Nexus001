import React, { useEffect, useMemo, useState } from "react";
import api from "../api";
import { Avatar } from "../components/Badges";
import { Button } from "../components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import SendNudgeModal from "../components/SendNudgeModal";
import { MessageCircle, Mail, Check, Megaphone } from "lucide-react";
import { toast } from "sonner";

const LEVEL_LABEL = ["Friendly", "Firm", "Urgent", "Final Notice"];
const LEVEL_COLOR = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

const dayDiff = (d) => {
  try { return Math.max(0, Math.floor((new Date() - new Date(d)) / 86400000)); } catch { return 0; }
};

export default function Nudge() {
  const [overdue, setOverdue] = useState([]);
  const [previews, setPreviews] = useState({});
  const [logs, setLogs] = useState([]);
  const [nudge, setNudge] = useState({ open: false, txn: null, channel: "whatsapp" });

  const load = async () => {
    const [t, l] = await Promise.all([
      api.get("/transactions", { params: { status: "Overdue" } }),
      api.get("/nudge/log"),
    ]);
    setOverdue(t.data);
    setLogs(l.data);
    // load message previews in parallel
    const prevs = await Promise.all(t.data.map(x => api.get(`/nudge/preview/${x.id}`).then(r => [x.id, r.data]).catch(() => [x.id, null])));
    setPreviews(Object.fromEntries(prevs));
  };
  useEffect(() => { load(); }, []);

  const markPaid = async (t) => {
    try { await api.put(`/transactions/${t.id}`, { status: "Paid" }); toast.success("Marked paid"); load(); } catch { toast.error("Failed"); }
  };

  return (
    <div className="space-y-6" data-testid="nudge-page">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2"><Megaphone size={26} className="text-[#f59e0b]"/> Nudge Center</h1>
          <p className="text-sm text-[#888] mt-1">Auto-escalating reminders for overdue loans.</p>
        </div>
        <div className="text-xs text-[#666]">{overdue.length} overdue</div>
      </header>

      <Tabs defaultValue="overdue">
        <TabsList className="bg-[#111] border border-[#222]">
          <TabsTrigger value="overdue" data-testid="tab-overdue-cards">Overdue ({overdue.length})</TabsTrigger>
          <TabsTrigger value="log" data-testid="tab-delivery-log">Delivery log ({logs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overdue" className="mt-4">
          {overdue.length === 0 && (
            <div className="card p-12 text-center text-[#666] text-sm">🎉 Nothing overdue. You're on top of it.</div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {overdue.map(t => {
              const lvl = Math.min((t.nudge_count ?? 0), 3);
              const color = LEVEL_COLOR[lvl];
              const days = dayDiff(t.due_date);
              const wa = previews[t.id]?.whatsapp_message || "";
              return (
                <div key={t.id} className="card p-5" data-testid={`overdue-card-${t.id}`}>
                  <div className="flex items-center gap-3">
                    <Avatar color={t.avatar_color} initials={t.initials} size={44} />
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-semibold truncate">{t.borrower_name}</div>
                      <div className="text-xs text-[#666]">{t.borrower_phone}</div>
                    </div>
                    <span className="pill" style={{ background: `${color}22`, color }}>Level {lvl} · {LEVEL_LABEL[lvl]}</span>
                  </div>

                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="text-3xl font-extrabold tabnum text-[#ef4444]">₹{Number(t.amount).toLocaleString("en-IN")}</div>
                      <div className="text-xs text-[#888] mt-1">{days} days overdue · due {t.due_date}</div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-[#0c0c0c] border border-[#1a1a1a] p-3">
                    <div className="text-[10px] uppercase tracking-widest text-[#666] mb-1">Preview</div>
                    <div className="text-xs text-[#bbb] whitespace-pre-wrap line-clamp-3">{wa.split("\n").slice(0,2).join("\n")}…</div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Button size="sm" onClick={()=>setNudge({ open: true, txn: t, channel: "whatsapp" })} className="bg-[#22c55e] hover:bg-[#16a34a] text-[#0a0a0a] font-semibold" data-testid={`nudge-wa-${t.id}`}><MessageCircle size={14} className="mr-1"/>WhatsApp</Button>
                    <Button size="sm" onClick={()=>setNudge({ open: true, txn: t, channel: "email" })} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold" data-testid={`nudge-email-${t.id}`}><Mail size={14} className="mr-1"/>Email</Button>
                    <Button size="sm" variant="outline" onClick={()=>markPaid(t)} className="border-[#2a2a2a] bg-transparent text-white hover:bg-[#1a1a1a]" data-testid={`nudge-paid-${t.id}`}><Check size={14} className="mr-1"/>Paid</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          <div className="card overflow-hidden">
            {logs.length === 0 && <div className="p-12 text-center text-[#666] text-sm">No reminders sent yet.</div>}
            {logs.map(l => (
              <div key={l.id} className="border-b last:border-0 px-4 py-3 flex items-center gap-3 flex-wrap text-sm" style={{ borderColor: "#1a1a1a" }}>
                <span className="text-xs text-[#666] tabnum w-32">{new Date(l.sent_at).toLocaleString("en-IN")}</span>
                {l.channel === "whatsapp" ? <MessageCircle size={14} className="text-[#22c55e]"/> : <Mail size={14} className="text-[#3b82f6]"/>}
                <span className="text-xs text-[#aaa] w-20">L{l.level} · {LEVEL_LABEL[l.level]}</span>
                <span className="font-semibold flex-1 min-w-[120px]">{l.borrower_name}</span>
                <span className={`pill ${l.status === "sent" ? "pill-green" : "pill-red"}`}>{l.status}</span>
                <div className="basis-full text-xs text-[#777] truncate">{l.message_text.split("\n")[0]}</div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <SendNudgeModal
        open={nudge.open}
        onOpenChange={(v)=>setNudge(n=>({...n, open: v}))}
        transaction={nudge.txn}
        channel={nudge.channel}
        onSent={load}
      />
    </div>
  );
}
