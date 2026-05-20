"use client";

import { useEffect } from "react";
import { HttpTransportType, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { useAuthStore } from "@/store/useAuthStore";
import { useRealtimeStore } from "@/store/useRealtimeStore";
import { resolveHubBaseUrl } from "@/lib/axios";

const EVENT_MAP = [
  "inventoryChanged",
  "catalogChanged",
  "cashFlowChanged",
  "dashboardChanged",
] as const;

export default function RealtimeBridge() {
  const user = useAuthStore((state) => state.user);
  const setConnectionState = useRealtimeStore((state) => state.setConnectionState);
  const setLastEvent = useRealtimeStore((state) => state.setLastEvent);

  useEffect(() => {
    if (!user?.token) {
      setConnectionState("idle");
      return;
    }

    const connection = new HubConnectionBuilder()
      // 1. Dùng URL tuyệt đối của BE, KHÔNG qua proxy của Next.js (port 3000)
      .withUrl("http://localhost:5122/hubs/operations", {
        accessTokenFactory: () => user.token,
        // 2. Ép dùng WebSocket ngay từ đầu
        transport: HttpTransportType.WebSockets,
        // 3. Bỏ qua bước đàm phán ID để tránh lỗi "Connection ID not found"
        skipNegotiation: true
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    EVENT_MAP.forEach((eventName) => {
      connection.on(eventName, (payload) => {
        const event = {
          type: eventName,
          payload,
          occurredAt: new Date().toISOString(),
        };

        setLastEvent(event);
        window.dispatchEvent(new CustomEvent("hkd:realtime", { detail: event }));
      });
    });

    connection.onreconnecting(() => setConnectionState("reconnecting"));
    connection.onreconnected(() => setConnectionState("connected"));
    connection.onclose(() => setConnectionState("disconnected"));

    setConnectionState("connecting");
    connection.start()
      .then(() => setConnectionState("connected"))
      .catch(() => setConnectionState("disconnected"));

    return () => {
      void connection.stop();
      setConnectionState("idle");
    };
  }, [setConnectionState, setLastEvent, user?.token]);

  return null;
}
