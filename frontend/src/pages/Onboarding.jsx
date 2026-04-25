import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || "",
    college: "",
    branch: "",
    upi_id: "",
  });
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.college || !form.branch || !form.upi_id) {
      toast.error("All fields required");
      return;
    }
    if (!/^[a-zA-Z0-9.\-_]+@[a-zA-Z]+$/.test(form.upi_id)) {
      toast.error("UPI ID looks invalid (e.g. you@okaxis)");
      return;
    }
    setBusy(true);
    try {
      const r = await api.post("/users/onboard", form);
      setUser(r.data);
      toast.success("Welcome to Nexus 001");
      navigate("/dashboard");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#0a0a0a" }} data-testid="onboarding-page">
      <div className="w-full max-w-md card p-7">
        <div className="text-[10px] tracking-[0.3em] uppercase text-[#666] font-semibold">Almost there</div>
        <h2 className="text-2xl font-bold mt-1">One quick setup</h2>
        <p className="text-sm text-[#888] mt-1">We'll use your UPI ID to embed payment links inside reminders.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label className="text-xs text-[#888]">Full name</Label>
            <Input value={form.name} onChange={(e)=>set("name", e.target.value)} className="bg-[#0a0a0a] border-[#222] text-white mt-1" data-testid="onb-name"/>
          </div>
          <div>
            <Label className="text-xs text-[#888]">College / Institution</Label>
            <Input value={form.college} onChange={(e)=>set("college", e.target.value)} className="bg-[#0a0a0a] border-[#222] text-white mt-1" data-testid="onb-college" placeholder="IIT Bombay"/>
          </div>
          <div>
            <Label className="text-xs text-[#888]">Branch / Department</Label>
            <Input value={form.branch} onChange={(e)=>set("branch", e.target.value)} className="bg-[#0a0a0a] border-[#222] text-white mt-1" data-testid="onb-branch" placeholder="Computer Science"/>
          </div>
          <div>
            <Label className="text-xs text-[#888]">UPI ID</Label>
            <Input value={form.upi_id} onChange={(e)=>set("upi_id", e.target.value)} className="bg-[#0a0a0a] border-[#222] text-white mt-1 font-mono" data-testid="onb-upi" placeholder="piyush@okaxis"/>
            <div className="text-[11px] text-[#555] mt-1">Used in all reminder messages and QR codes</div>
          </div>
          <Button type="submit" disabled={busy} className="w-full btn-accent mt-2" data-testid="onb-submit">
            {busy ? "Saving…" : "Enter dashboard →"}
          </Button>
        </form>
      </div>
    </div>
  );
}
