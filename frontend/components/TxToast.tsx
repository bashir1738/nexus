"use client";

import { useEffect } from "react";
import { useWeb3 } from "@/lib/web3Context";

export default function TxToast() {
  const { tx, clearTx } = useWeb3();

  useEffect(() => {
    if (tx.success || tx.error) {
      const t = setTimeout(clearTx, 5000);
      return () => clearTimeout(t);
    }
  }, [tx.success, tx.error, clearTx]);

  if (!tx.success && !tx.error && !tx.loading) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
      {tx.loading && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 text-white shadow-lg">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Transaction pending…</span>
        </div>
      )}
      {tx.success && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-600 text-white shadow-lg">
          <span className="text-lg">✓</span>
          <span className="text-sm font-medium">{tx.success}</span>
        </div>
      )}
      {tx.error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-600 text-white shadow-lg">
          <span className="text-lg">✕</span>
          <span className="text-sm font-medium">{tx.error}</span>
        </div>
      )}
    </div>
  );
}
