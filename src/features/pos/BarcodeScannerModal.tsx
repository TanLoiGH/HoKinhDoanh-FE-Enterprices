import { Camera, X } from "lucide-react";

interface BarcodeScannerModalProps {
  scannerMessage: string;
  onClose: () => void;
}

export function BarcodeScannerModal({ scannerMessage, onClose }: BarcodeScannerModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/80 p-0 backdrop-blur-sm md:items-center md:justify-center md:p-6">
      <div className="app-panel-strong w-full overflow-hidden rounded-t-[2rem] md:max-w-lg md:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-app p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Barcode scanner</p>
            <h2 className="text-xl font-black text-app-strong">Quét mã sản phẩm</h2>
          </div>
          <button onClick={onClose} className="app-button-ghost touch-target" aria-label="Đóng camera">
            <X className="mx-auto h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="relative overflow-hidden rounded-[2rem] bg-slate-950">
            <video id="barcode-scanner-video" className="aspect-[3/4] w-full object-cover" muted playsInline autoPlay />
            <div className="pointer-events-none absolute inset-0 border-[20px] border-slate-950/35" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-3xl border-2 border-emerald-400/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.15)]" />
          </div>

          <div className="app-panel-subtle mt-4 rounded-3xl p-4 text-sm font-bold text-app-muted">
            <div className="flex items-center gap-2 text-app-strong">
              <Camera className="h-4 w-4 text-blue-600" />
              Camera scan
            </div>
            <p className="mt-2 text-xs leading-5 text-app-muted">{scannerMessage}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
