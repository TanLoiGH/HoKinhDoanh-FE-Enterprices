import type { AxiosRequestConfig } from "axios";

const STORAGE_KEY = "hkd-offline-mutations";
const ELIGIBLE_PATHS = ["/orders", "/cashflow", "/inventory/import"];

export interface OfflineMutation {
  id: string;
  url: string;
  method: "post";
  data: unknown;
  createdAt: string;
}

function readQueue(): OfflineMutation[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OfflineMutation[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: OfflineMutation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("hkd:offline-queue-updated", { detail: { count: items.length } }));
}

export function getOfflineQueueCount() {
  return readQueue().length;
}

export function isEligibleOfflineMutation(config?: AxiosRequestConfig) {
  const method = (config?.method || "get").toLowerCase();
  const url = typeof config?.url === "string" ? config.url : "";
  return method === "post" && ELIGIBLE_PATHS.some((path) => url.startsWith(path));
}

export function enqueueOfflineMutation(config: AxiosRequestConfig) {
  const url = typeof config.url === "string" ? config.url : "";
  const queue = readQueue();
  const mutation: OfflineMutation = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${queue.length + 1}`,
    url,
    method: "post",
    data: config.data ? JSON.parse(config.data as string) : {},
    createdAt: new Date().toISOString(),
  };

  queue.push(mutation);
  writeQueue(queue);
  return mutation;
}

export async function flushOfflineQueue(options: {
  token: string;
  resolveBaseUrl: () => string;
}) {
  const queue = readQueue();
  if (queue.length === 0) return { flushed: 0, remaining: 0 };

  let flushed = 0;
  const remaining: OfflineMutation[] = [];

  for (const item of queue) {
    try {
      const response = await fetch(`${options.resolveBaseUrl()}${item.url}`, {
        method: item.method.toUpperCase(),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${options.token}`,
        },
        body: JSON.stringify(item.data),
      });

      if (!response.ok) {
        remaining.push(item);
        continue;
      }

      flushed += 1;
    } catch {
      remaining.push(item);
    }
  }

  writeQueue(remaining);
  return { flushed, remaining: remaining.length };
}
