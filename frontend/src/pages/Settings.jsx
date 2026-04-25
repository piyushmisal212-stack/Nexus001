import React, { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Eye, EyeOff, Download, Trash2, MessageCircle, Mail, User, AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { user, refresh, logout } = useAuth();
  const [tab, setTab] = useState("profile");

  return (
    <div className="space-y-6" data-testid="settings-page">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-sm text-[#888] mt-1">Manage your profile, integrations, and data.</p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-[#111] border border-[#222]">
          <TabsTrigger value="profile" data-testid="tab-profile"><User size={14} className="mr-1"/>Profile</TabsTrigger>
          <TabsTrigger value="whatsapp" data-testid="tab-whatsapp"><MessageCircle size={14} className="mr-1"/>WhatsApp</TabsTrigger>
          <TabsTrigger value="email" data-testid="tab-email"><Mail size={14} className="mr-1"/>Email</TabsTrigger>
          <TabsTrigger value="danger" data-testid="tab-danger"><AlertTriangle size={14} className="mr-1"/>Danger zone</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4"><ProfileTab user={user} refresh={refresh}/></TabsContent>
        <TabsContent value="whatsapp" className="mt-4"><WhatsappTab/></TabsContent>
        <TabsContent value="email" className="mt-4"><EmailTab user={user} refresh={refresh}/></TabsContent>
        <TabsContent value="danger" className="mt-4"><DangerTab logout={logout}/></TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileTab({ user, refresh }) {
  const [form, setForm] = useState({
    name: user?.name || "", college: user?.college || "",
    branch: user?.branch || "", upi_id: user?.upi_id || "",
  });
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState(null);

  useEffect(() => {
    api.get("/users/qr").then(r => setQr(r.data)).catch(() => {});
  }, [user?.upi_id]);

  const set = (k,v) => setForm(f => ({...f, [k]: v}));
  const save = async () => {
    setBusy(true);
    try { await api.put("/users/profile", form); await refresh(); toast.success("Saved"); }
    catch (e) { toast.error("Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="card p-6 lg:col-span-2 space-y-4">
        <div className="flex items-center gap-3">
          {user?.picture && <img src={user.picture} alt="" className="w-12 h-12 rounded-full"/>}
          <div>
            <div className="font-semibold">{user?.email}</div>
            <div className="text-xs text-[#666]">Signed in via Google</div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-xs text-[#888]">Name</Label><Input value={form.name} onChange={(e)=>set("name", e.target.value)} className="bg-[#0a0a0a] border-[#222] text-white mt-1" data-testid="profile-name"/></div>
          <div><Label className="text-xs text-[#888]">UPI ID</Label><Input value={form.upi_id} onChange={(e)=>set("upi_id", e.target.value)} className="bg-[#0a0a0a] border-[#222] text-white mt-1 font-mono" data-testid="profile-upi"/></div>
          <div><Label className="text-xs text-[#888]">College</Label><Input value={form.college} onChange={(e)=>set("college", e.target.value)} className="bg-[#0a0a0a] border-[#222] text-white mt-1" data-testid="profile-college"/></div>
          <div><Label className="text-xs text-[#888]">Branch</Label><Input value={form.branch} onChange={(e)=>set("branch", e.target.value)} className="bg-[#0a0a0a] border-[#222] text-white mt-1" data-testid="profile-branch"/></div>
        </div>
        <Button onClick={save} disabled={busy} className="btn-accent" data-testid="profile-save">{busy ? "Saving…" : "Save changes"}</Button>
      </div>

      <div className="card p-6">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#666] font-semibold">Your UPI QR</div>
        {qr?.qr_base64 ? (
          <>
            <img src={qr.qr_base64} alt="" className="mt-3 w-full max-w-[220px] mx-auto rounded-xl bg-white p-3"/>
            <div className="mt-2 text-center text-xs text-[#888] font-mono">{user?.upi_id}</div>
            <Button onClick={() => { const a=document.createElement("a"); a.href=qr.qr_base64; a.download="nexus-personal-qr.png"; a.click(); }} className="mt-3 w-full btn-accent" data-testid="personal-qr-download"><Download size={14} className="mr-1"/>Download</Button>
          </>
        ) : (
          <div className="mt-3 text-xs text-[#666]">Set your UPI ID to generate a QR code.</div>
        )}
      </div>
    </div>
  );
}

function WhatsappTab() {
  return (
    <div className="card p-6 max-w-2xl">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="w-2 h-2 rounded-full bg-[#22c55e]"/> Deep-link mode active
      </div>
      <p className="mt-3 text-sm text-[#bbb]">
        Nexus 001 sends WhatsApp reminders by opening WhatsApp on your phone with the message pre-filled — no setup, no QR scan, no session drops.
      </p>
      <ul className="mt-4 space-y-2 text-sm text-[#aaa]">
        <li className="flex gap-2"><span className="text-[#22c55e]">✓</span>Works from any device — uses your own WhatsApp account</li>
        <li className="flex gap-2"><span className="text-[#22c55e]">✓</span>Editable preview before sending</li>
        <li className="flex gap-2"><span className="text-[#22c55e]">✓</span>Auto-escalates from Friendly → Final Notice</li>
      </ul>
      <a href="https://wa.me/" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-xs text-[#3b82f6] hover:underline">
        Test wa.me link <ExternalLink size={12}/>
      </a>
    </div>
  );
}

function EmailTab({ user, refresh }) {
  const [form, setForm] = useState({ gmail_address: user?.gmail_address || "", gmail_app_password: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  const save = async () => {
    if (!form.gmail_address || !form.gmail_app_password) { toast.error("Both fields required"); return; }
    setBusy(true);
    try { await api.put("/users/email-settings", form); await refresh(); toast.success("Saved"); setForm(f => ({...f, gmail_app_password: "•••••••• saved"})); }
    catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };
  const test = async () => {
    setTesting(true);
    try { await api.post("/users/email-test"); toast.success("Test email sent — check your inbox"); }
    catch (e) { toast.error(e?.response?.data?.detail || "Test failed"); }
    finally { setTesting(false); }
  };

  return (
    <div className="card p-6 max-w-2xl space-y-4" data-testid="email-settings-card">
      <div>
        <div className="text-sm font-semibold">Connect Gmail (for email nudges)</div>
        <div className="text-xs text-[#888] mt-1">
          Enable 2FA on your Google account → search "App Passwords" → create one for "Nexus 001" → paste below.
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-[#888]">Gmail address</Label>
          <Input value={form.gmail_address} onChange={(e)=>setForm(f=>({...f, gmail_address: e.target.value}))} className="bg-[#0a0a0a] border-[#222] text-white mt-1" data-testid="email-gmail" placeholder="you@gmail.com"/>
        </div>
        <div>
          <Label className="text-xs text-[#888]">App password</Label>
          <div className="relative mt-1">
            <Input type={show ? "text" : "password"} value={form.gmail_app_password} onChange={(e)=>setForm(f=>({...f, gmail_app_password: e.target.value}))} className="bg-[#0a0a0a] border-[#222] text-white pr-9" data-testid="email-app-password" placeholder="abcd efgh ijkl mnop"/>
            <button type="button" onClick={()=>setShow(s=>!s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#666] hover:text-white">{show ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={save} disabled={busy} className="btn-accent" data-testid="email-save">{busy ? "Saving…" : "Save"}</Button>
        <Button onClick={test} disabled={testing || !user?.has_email_creds} variant="outline" className="border-[#2a2a2a] bg-transparent text-white hover:bg-[#1a1a1a]" data-testid="email-test">
          {testing ? <RefreshCw size={14} className="mr-1 animate-spin"/> : <Mail size={14} className="mr-1"/>}
          Test connection
        </Button>
      </div>
      {user?.has_email_creds && <div className="text-xs text-[#22c55e]">✓ Configured for {user.gmail_address}</div>}
    </div>
  );
}

function DangerTab({ logout }) {
  const exp = async () => {
    const r = await api.get("/users/export");
    const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "nexus-export.json"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  };
  const del = async () => {
    if (!window.confirm("Permanently delete your account and all data?")) return;
    try { await api.delete("/users/me"); toast.success("Account deleted"); logout(); }
    catch { toast.error("Failed"); }
  };
  return (
    <div className="card p-6 space-y-4 max-w-2xl border-[#3a1a1a]">
      <div>
        <div className="text-sm font-semibold">Export your data</div>
        <div className="text-xs text-[#888]">Download all transactions as JSON.</div>
        <Button onClick={exp} variant="outline" className="mt-3 border-[#2a2a2a] bg-transparent text-white hover:bg-[#1a1a1a]" data-testid="export-btn"><Download size={14} className="mr-1"/>Export JSON</Button>
      </div>
      <div className="border-t border-[#1a1a1a] pt-4">
        <div className="text-sm font-semibold text-[#ef4444]">Delete account</div>
        <div className="text-xs text-[#888]">Permanently removes all your transactions and reminders.</div>
        <Button onClick={del} className="mt-3 bg-[#ef4444] hover:bg-[#dc2626] text-white" data-testid="delete-account-btn"><Trash2 size={14} className="mr-1"/>Delete account</Button>
      </div>
    </div>
  );
}
