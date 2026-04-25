import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Download, Copy, Check } from "lucide-react";
import api from "../api";
import { toast } from "sonner";

export default function QRModal({ open, onOpenChange, transactionId }) {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !transactionId) return;
    setData(null);
    api.get(`/transactions/${transactionId}/qr`)
       .then(r => setData(r.data))
       .catch(e => toast.error(e?.response?.data?.detail || "Failed to load QR"));
  }, [open, transactionId]);

  const download = () => {
    if (!data?.qr_base64) return;
    const a = document.createElement("a");
    a.href = data.qr_base64;
    a.download = `nexus-qr-${transactionId}.png`;
    a.click();
  };

  const copy = async () => {
    if (!data?.upi_link) return;
    await navigator.clipboard.writeText(data.upi_link);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
    toast.success("UPI link copied");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-[#111] border-[#222] text-white" data-testid="qr-modal">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {data ? `${data.borrower_name} · ₹${Number(data.amount).toLocaleString("en-IN")}` : "Loading…"}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#666]">UPI payment QR code — scan with any UPI app to pay.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center pt-2">
          {data?.qr_base64 ? (
            <img src={data.qr_base64} alt="UPI QR" className="w-60 h-60 rounded-xl bg-white p-3" />
          ) : (
            <div className="w-60 h-60 skel rounded-xl" />
          )}
          <div className="mt-3 text-xs text-[#888] text-center">Scan with GPay, PhonePe or Paytm</div>
          <div className="mt-4 flex gap-2 w-full">
            <Button onClick={download} className="flex-1 btn-accent" data-testid="qr-download-btn">
              <Download size={14} className="mr-1" /> Download
            </Button>
            <Button onClick={copy} variant="outline" className="flex-1 border-[#2a2a2a] bg-transparent text-white hover:bg-[#1a1a1a]" data-testid="qr-copy-btn">
              {copied ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />} Copy link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
