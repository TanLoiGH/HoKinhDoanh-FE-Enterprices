"use client";

import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, Wifi } from "lucide-react";
import { flushOfflineQueue, getOfflineQueueCount } from "@/lib/offlineQueue";
import { resolveApiBaseUrl } from "@/lib/axios";
import { useAuthStore } from "@/store/useAuthStore";
import { useRealtimeStore } from "@/store/useRealtimeStore";

export default function OfflineSync() {
  const user = useAuthStore((state) => state.user);
  const connectionState = useRealtimeStore((state) => state.connectionState);
  const [pendingCount, setPendingCount] = useState(0);
  const [networkState, setNetworkState] = useState<"unknown" | "online" | "offline">("unknown");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const updateCount = () => setPendingCount(getOfflineQueueCount());
    const handleOnline = () => {
      setNetworkState("online");
      if (!user?.token) return;

      setSyncing(true);
      void flushOfflineQueue({
        token: user.token,
        resolveBaseUrl: resolveApiBaseUrl,
      }).finally(() => {
        updateCount();
        setSyncing(false);
      });
    };
    const handleOffline = () => setNetworkState("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("hkd:offline-queue-updated", updateCount as EventListener);

    const initTimer = window.setTimeout(() => {
      updateCount();
      if (navigator.onLine) {
        handleOnline();
      } else {
        handleOffline();
      }
    }, 0);

    return () => {
      window.clearTimeout(initTimer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("hkd:offline-queue-updated", updateCount as EventListener);
    };
  }, [user?.token]);

  const isOffline = networkState === "offline";
  const show = isOffline || pendingCount > 0 || syncing || connectionState !== "connected";

  if (!show) return null;

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-lg backdrop-blur-md">
      {syncing ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" /> : isOffline ? <CloudOff className="h-3.5 w-3.5 text-rose-600" /> : <Wifi className="h-3.5 w-3.5 text-emerald-600" />}
      <span>
        {isOffline ? "Offline" : connectionState === "connected" ? "Realtime" : networkState === "unknown" ? "Starting" : "Reconnecting"}
      </span>
      {pendingCount > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">{pendingCount} queue</span>}
    </div>
  );
}
