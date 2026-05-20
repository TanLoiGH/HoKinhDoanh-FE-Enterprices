import { create } from "zustand";

export type RealtimeConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

export interface RealtimeEventPayload {
  type: string;
  payload: unknown;
  occurredAt: string;
}

interface RealtimeState {
  connectionState: RealtimeConnectionState;
  lastEvent: RealtimeEventPayload | null;
  setConnectionState: (state: RealtimeConnectionState) => void;
  setLastEvent: (event: RealtimeEventPayload) => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  connectionState: "idle",
  lastEvent: null,
  setConnectionState: (connectionState) => set({ connectionState }),
  setLastEvent: (lastEvent) => set({ lastEvent }),
}));
