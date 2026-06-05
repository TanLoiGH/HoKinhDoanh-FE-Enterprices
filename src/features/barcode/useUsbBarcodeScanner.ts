"use client";

import { useEffect, useRef } from "react";

interface UsbBarcodeScannerOptions {
  enabled?: boolean;
  minLength?: number;
  maxKeyIntervalMs?: number;
  onScan: (barcode: string) => void | Promise<void>;
}

export const useUsbBarcodeScanner = ({
  enabled = true,
  minLength = 3,
  maxKeyIntervalMs = 80,
  onScan,
}: UsbBarcodeScannerOptions) => {
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    let buffer = "";
    let lastKeyAt = 0;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;

      const now = Date.now();
      if (now - lastKeyAt > maxKeyIntervalMs) {
        buffer = "";
      }
      lastKeyAt = now;

      if (event.key === "Enter" || event.key === "Tab") {
        const barcode = buffer.trim();
        buffer = "";
        if (barcode.length >= minLength) {
          event.preventDefault();
          void onScanRef.current(barcode);
        }
        return;
      }

      if (event.key.length === 1) {
        buffer += event.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, maxKeyIntervalMs, minLength]);
};
