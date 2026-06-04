import { Camera, ScanLine, X } from "lucide-react";
import Image from "next/image";
import type { PendingVietQrOrder } from "./types";

interface VietQrPaymentModalProps {
  order: PendingVietQrOrder;
  loading: boolean;
  formatCurrency: (value: number) => string;
  onClose: () => void;
  onSimulatePayment: () => void;
}

export function VietQrPaymentModal({
  order,
  loading,
  formatCurrency,
  onClose,
  onSimulatePayment,
}: VietQrPaymentModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/70 p-0 backdrop-blur-sm md:items-center md:justify-center md:p-6 animate-in fade-in duration-200">
      <div className="app-panel-strong max-h-[95dvh] w-full overflow-hidden rounded-t-[2rem] md:max-w-md md:rounded-[2.5rem] shadow-2xl border-t border-violet-100/10">
        <div className="flex items-center justify-between border-b border-app bg-app-surface p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 animate-pulse">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-violet-600">Thanh toán VietQR động</p>
              <h2 className="text-lg font-black text-app-strong">{order.code}</h2>
            </div>
          </div>
          <button onClick={onClose} className="app-button-ghost touch-target" aria-label="Đóng quét QR">
            <X className="mx-auto h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative p-4 bg-white rounded-3xl border-4 border-violet-100 shadow-inner group">
              <div className="absolute top-2 left-2 w-4 h-4 border-t-4 border-l-4 border-violet-600 rounded-tl-lg" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-4 border-r-4 border-violet-600 rounded-tr-lg" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-4 border-l-4 border-violet-600 rounded-bl-lg" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-4 border-r-4 border-violet-600 rounded-br-lg" />

              <Image
                src={order.qrUrl}
                alt="VietQR Code"
                width={224}
                height={224}
                unoptimized
                className="h-56 w-56 object-contain"
              />

              <div className="absolute inset-4 border-2 border-violet-500/20 rounded-2xl pointer-events-none animate-ping" />
            </div>

            <div className="flex items-center gap-2 bg-violet-50 px-4 py-1.5 rounded-full text-[11px] font-bold text-violet-700">
              <span className="w-2 h-2 rounded-full bg-violet-600 animate-ping" />
              Đang quét giao dịch ngân hàng...
            </div>
          </div>

          <div className="app-panel-subtle p-5 rounded-[2rem] space-y-3.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-app-muted font-semibold">Ngân hàng</span>
              <span className="font-black text-app-strong text-right">MB BANK (Quân Đội)</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-app-muted font-semibold">Số tài khoản</span>
              <span className="font-black font-mono text-app-strong text-right">190367899999</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-app-muted font-semibold">Tên tài khoản</span>
              <span className="font-black text-app-strong text-right">HKD ENTERPRISE</span>
            </div>
            <div className="flex justify-between items-center text-xs border-t border-app pt-3.5">
              <span className="text-app-muted font-semibold">Số tiền CK</span>
              <span className="text-base font-black text-blue-600 tracking-tight text-right">{formatCurrency(order.amount)}</span>
            </div>
            <div className="flex justify-between items-start text-xs border-t border-app pt-3.5">
              <span className="text-app-muted font-semibold">Nội dung CK</span>
              <span className="font-black font-mono text-violet-700 text-right bg-violet-50 px-2.5 py-1 rounded-xl">{order.code}</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="text-[10px] font-bold leading-relaxed text-app-muted text-center max-w-[280px] mx-auto">
              Khách hàng quét VietQR trên để chuyển khoản 24/7. POS sẽ hoàn tất đơn hàng tự động sau khi tiền vào tài khoản.
            </div>

            <div className="border-t border-app my-4" />

            <button
              type="button"
              onClick={onSimulatePayment}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white py-3.5 text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/25"
            >
              <Camera className="w-4 h-4" />
              {loading ? "Đang xử lý..." : "Giả lập quét QR (Test offline)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
