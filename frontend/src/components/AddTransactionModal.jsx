import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import api from "../api";
import { toast } from "sonner";

const CATS = ["LOAN", "SHARED", "PROJECT", "FOOD", "TRAVEL"];

export default function AddTransactionModal({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState({
    borrower_name: "", borrower_phone: "", borrower_email: "",
    amount: "", due_date: "", category: "LOAN", notes: "",
  });
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.borrower_name || !form.borrower_phone || !form.amount || !form.due_date) {
      toast.error("Name, phone, amount and due date are required");
      return;
    }
    if (!/^\d{10}$/.test(form.borrower_phone)) {
      toast.error("Phone must be 10 digits");
      return;
    }
    setBusy(true);
    try {
      const r = await api.post("/transactions", { ...form, amount: Number(form.amount) });
      toast.success("Transaction added");
      onCreated?.(r.data);
      onOpenChange(false);
      setForm({ borrower_name: "", borrower_phone: "", borrower_email: "", amount: "", due_date: "", category: "LOAN", notes: "" });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#111] border-[#222] text-white" data-testid="add-transaction-modal">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">New transaction</DialogTitle>
          <DialogDescription className="text-xs text-[#888]">Track who owes you and when it's due.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <Label className="text-xs text-[#888]">Borrower name</Label>
            <Input value={form.borrower_name} onChange={(e)=>set("borrower_name", e.target.value)} className="bg-[#0a0a0a] border-[#222] text-white mt-1" data-testid="input-borrower-name" placeholder="Rahul Sharma"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-[#888]">Phone (10 digits)</Label>
              <Input value={form.borrower_phone} onChange={(e)=>set("borrower_phone", e.target.value.replace(/\D/g, "").slice(0,10))} className="bg-[#0a0a0a] border-[#222] text-white mt-1" data-testid="input-borrower-phone" placeholder="9876543210"/>
            </div>
            <div>
              <Label className="text-xs text-[#888]">Amount (₹)</Label>
              <Input type="number" value={form.amount} onChange={(e)=>set("amount", e.target.value)} className="bg-[#0a0a0a] border-[#222] text-white mt-1" data-testid="input-amount" placeholder="500"/>
            </div>
          </div>
          <div>
            <Label className="text-xs text-[#888]">Email (optional, for email nudges)</Label>
            <Input value={form.borrower_email} onChange={(e)=>set("borrower_email", e.target.value)} className="bg-[#0a0a0a] border-[#222] text-white mt-1" data-testid="input-borrower-email" placeholder="rahul@example.com"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-[#888]">Due date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" data-testid="input-due-date"
                    className="w-full mt-1 h-10 px-3 rounded-md bg-[#0a0a0a] border border-[#222] text-white text-sm flex items-center justify-between hover:bg-[#0f0f0f]">
                    <span className={form.due_date ? "text-white" : "text-[#666]"}>
                      {form.due_date ? format(new Date(form.due_date), "PPP") : "Pick a date"}
                    </span>
                    <CalendarIcon size={14} className="text-[#666]"/>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="bg-[#111] border-[#222] text-white p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.due_date ? new Date(form.due_date) : undefined}
                    onSelect={(d) => d && set("due_date", format(d, "yyyy-MM-dd"))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs text-[#888]">Category</Label>
              <Select value={form.category} onValueChange={(v)=>set("category", v)}>
                <SelectTrigger className="bg-[#0a0a0a] border-[#222] text-white mt-1" data-testid="select-category"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#111] border-[#222] text-white">
                  {CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs text-[#888]">Notes (optional)</Label>
            <Textarea value={form.notes} onChange={(e)=>set("notes", e.target.value)} className="bg-[#0a0a0a] border-[#222] text-white mt-1 resize-none" data-testid="input-notes" rows={2}/>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={()=>onOpenChange(false)} className="flex-1 border-[#2a2a2a] bg-transparent text-white hover:bg-[#1a1a1a]" data-testid="cancel-add-txn">Cancel</Button>
            <Button onClick={submit} disabled={busy} className="flex-1 btn-accent" data-testid="submit-add-txn">{busy ? "Saving…" : "Add transaction"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
