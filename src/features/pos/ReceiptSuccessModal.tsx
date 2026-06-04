import { Printer, X } from "lucide-react";
import type { OrderReceipt, ReceiptDeliveryStatus } from "./types";

interface ReceiptSuccessModalProps {
  receipt: OrderReceipt;
  receiptDeliveryStatus: ReceiptDeliveryStatus | null;
  receiptDue: number;
  receiptPaid: number;
  receiptChange: number;
  formatCurrency: (value: number) => string;
  formatDateTime: (value: string) => string;
  onClose: () => void;
  onCopyLink: () => void;
  onPrint: () => void;
}

export function ReceiptSuccessModal({
  receipt,
  receiptDeliveryStatus,
  receiptDue,
  receiptPaid,
  receiptChange,
  formatCurrency,
  formatDateTime,
  onClose,
  onCopyLink,
  onPrint,
}: ReceiptSuccessModalProps) {
  const deliveryLabel = receiptDeliveryStatus?.isConfigured
    ? `đã cấu hình ${receiptDeliveryStatus.defaultProvider}`
    : "chưa kết nối provider";

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/60 p-0 backdrop-blur-sm md:items-center md:justify-center md:p-6">
      <div className="app-panel-strong max-h-[92dvh] w-full overflow-hidden rounded-t-[2rem] md:max-w-md md:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-app p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Thanh toán thành công</p>
            <h2 className="text-xl font-black text-app-strong">{receipt.code}</h2>
            <p className="mt-1 text-[10px] font-bold text-app-muted">Nhắc khách kiểm tra hóa đơn trước khi rời quầy.</p>
            <p className="mt-2 text-[10px] font-bold text-app-soft">Gửi Zalo/SMS: {deliveryLabel}</p>
          </div>
          <button onClick={onClose} className="app-button-ghost touch-target" aria-label="Đóng hóa đơn">
            <X className="mx-auto h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[62dvh] overflow-y-auto p-5">
          <div className="app-panel-subtle mb-4 p-4 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-app-muted">Chi nhánh</span>
              <strong className="text-right text-app-strong">{receipt.branchName}</strong>
            </div>
            <div className="mt-2 flex justify-between gap-3">
              <span className="text-app-muted">Thời gian</span>
              <strong className="text-right text-app-strong">{formatDateTime(receipt.createdAt)}</strong>
            </div>
            <div className="mt-2 flex justify-between gap-3">
              <span className="text-app-muted">Thu ngân</span>
              <strong className="text-right text-app-strong">{receipt.cashierName}</strong>
            </div>
          </div>

          <div className="space-y-3">
            {receipt.items.map((item) => (
              <div key={`${item.productCode}-${item.productName}`} className="app-list-item border border-app p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-app-strong">{item.productName}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-app-soft">{item.productCode}</p>
                  </div>
                  <p className="shrink-0 text-sm font-black text-blue-600">{formatCurrency(item.subtotal)}</p>
                </div>
                <div className="mt-3 flex justify-between text-xs font-bold text-app-muted">
                  <span>{item.qty} x {formatCurrency(item.unitPrice)}</span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-3xl bg-slate-900 p-5 text-white">
            <div className="flex justify-between text-sm text-white/70">
              <span>Tạm tính</span>
              <span>{formatCurrency(receipt.totalAmount)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm text-white/70">
              <span>Giảm giá</span>
              <span>{formatCurrency(receipt.discount)}</span>
            </div>
            <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-lg font-black">
              <span>Thanh toán</span>
              <span>{formatCurrency(receiptDue)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm text-white/70">
              <span>{receipt.paymentMethod === "Transfer" ? "Thanh toán" : "Khách đưa"}</span>
              <span>{receipt.paymentMethod === "Transfer" ? "Chuyển khoản" : formatCurrency(receiptPaid)}</span>
            </div>
            {receipt.paymentReference && (
              <div className="mt-2 flex justify-between text-sm text-violet-200">
                <span>Mã CK</span>
                <span className="font-mono text-xs">{receipt.paymentReference}</span>
              </div>
            )}
            {receipt.paymentMethod === "Cash" && (
              <div className="mt-2 flex justify-between text-sm text-emerald-300">
                <span>Trả lại</span>
                <span>{formatCurrency(receiptChange)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-app p-5">
          <button onClick={onClose} className="app-button-secondary text-xs font-black uppercase tracking-widest">
            Đóng
          </button>
          <button onClick={onCopyLink} className="app-button-secondary text-xs font-black uppercase tracking-widest">
            Copy link
          </button>
          <button onClick={onPrint} className="app-button-primary flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest">
            <Printer className="h-4 w-4" />
            In bill
          </button>
        </div>
      </div>
    </div>
  );
}
