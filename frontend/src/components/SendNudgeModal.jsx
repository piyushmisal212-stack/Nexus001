import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { MessageCircle, Mail, Send } from "lucide-react";
import api from "../api";
import { toast } from "sonner";

const LEVELS = ["Friendly", "Firm", "Urgent", "Final"];
const LEVEL_COLOR = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

export default function SendNudgeModal({ open, onOpenChange, transaction, channel, onSent }) {
  const [preview, setPreview] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !transaction) return;
    setPreview(null);
    api.get(`/nudge/preview/${transaction.id}`).then(r => {
      setPreview(r.data);
      setText(channel === "email" ? r.data.email_message : r.data.whatsapp_message);
    }).catch(e => toast.error(e?.response?.data?.detail || "Failed to load preview"));
  }, [open, transaction, channel]);

  const send = async () => {
    if (!transaction) return;
    setBusy(true);
    try {
      const url = channel === "email"
        ? `/nudge/email/${transaction.id}`
        : `/nudge/whatsapp/${transaction.id}`;
      const r = await api.post(url, { message: text, level: preview?.level ?? 0 });
      if (channel === "whatsapp" && r.data?.wa_link) {
        window.open(r.data.wa_link, "_blank");
        toast.success("Opening WhatsApp…");
      } else {
        toast.success("Email sent");
      }
      onSent?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to send");
    } finally { setBusy(false); }
  };

  const level = preview?.level ?? 0;
  const accent = LEVEL_COLOR[level];
  const Icon = channel === "email" ? Mail : MessageCircle;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#111] border-[#222] text-white" data-testid={`send-nudge-${channel}-modal`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Icon size={16} /> {channel === "email" ? "Send Email" : "Send WhatsApp"}
            <span className="ml-auto text-xs font-normal text-[#888]">to {transaction?.borrower_name}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-[#666]">Edit the message before sending. Each send escalates to the next level.</DialogDescription>
        </DialogHeader>

        {/* Level progress */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {LEVELS.map((l, i) => (
            <div key={l} className="flex flex-col items-center gap-1">
              <div className="h-1.5 w-full rounded-full"
                   style={{ background: i <= level ? LEVEL_COLOR[i] : "#1a1a1a" }} />
              <span className={`text-[10px] uppercase tracking-wider font-semibold`}
                    style={{ color: i === level ? accent : "#666" }}>{l}</span>
            </div>
          ))}
        </div>

        {/* Preview area */}
        <div className="mt-2 rounded-2xl p-4"
             style={{
               background: channel === "email" ? "#0d0d0d" : "#0c1f14",
               border: `1px solid ${channel === "email" ? "#1a1a1a" : "#0e3a23"}`
             }}>
          <div className="text-[11px] uppercase tracking-widest text-[#777] mb-1">
            {channel === "email" ? `Subject: ${preview?.email_subject || ""}` : "WhatsApp preview"}
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={9}
            className="bg-transparent border-0 px-0 text-white text-sm whitespace-pre-wrap focus-visible:ring-0 resize-none"
            data-testid="nudge-message-textarea"
          />
        </div>

        {preview && (
          <div className="text-xs text-[#888]">
            {preview.days_overdue > 0 ? `${preview.days_overdue} days overdue · ` : ""}
            Level {level} of 3 — {LEVELS[level]}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={()=>onOpenChange(false)} className="flex-1 border-[#2a2a2a] bg-transparent text-white hover:bg-[#1a1a1a]">Cancel</Button>
          <Button onClick={send} disabled={busy || !text} className="flex-1 btn-accent" data-testid="nudge-send-btn">
            <Send size={14} className="mr-1" /> {busy ? "Sending…" : "Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
