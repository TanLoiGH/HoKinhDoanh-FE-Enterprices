import {
  AlertCircle,
  ArrowRightLeft,
  Banknote,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { formatBillLabel } from "./pricing";
import type {
  CartItem,
  Customer,
  DiscountMode,
  PaymentStep,
  PosPaymentMethod,
  PosTab,
  TransferSubMethod,
} from "./types";

interface CartPanelProps {
  activeTab: PosTab;
  cart: CartItem[];
  customers: Customer[];
  selectedCustomerId: number | null;
  totalItems: number;
  totalAmount: number;
  discountMode: DiscountMode;
  discountValue: string;
  discountAmount: number;
  payableAmount: number;
  paymentMethod: PosPaymentMethod;
  paymentStep: PaymentStep;
  paidAmount: string;
  paid: number;
  change: number;
  suggestedBills: number[];
  loading: boolean;
  canConfirmCash: boolean;
  canCompleteTransfer: boolean;
  transferSubMethod: TransferSubMethod;
  transferNote: string;
  invoiceVerified: boolean;
  formatCurrency: (value: number) => string;
  onCustomerChange: (customerId: number | null) => void;
  onUpdateQty: (id: number, delta: number) => void;
  onDiscountModeChange: (mode: DiscountMode) => void;
  onDiscountValueChange: (value: string) => void;
  onPaymentMethodChange: (method: PosPaymentMethod) => void;
  onPaidAmountChange: (value: string) => void;
  onTransferSubMethodChange: (method: TransferSubMethod) => void;
  onTransferNoteChange: (value: string) => void;
  onConfirmCashAmount: () => void;
  onResetPaymentFlow: () => void;
  onInvoiceVerifiedChange: (verified: boolean) => void;
  onVietQrCheckout: () => void;
  onCheckout: () => void;
}

export function CartPanel({
  activeTab,
  cart,
  customers,
  selectedCustomerId,
  totalItems,
  totalAmount,
  discountMode,
  discountValue,
  discountAmount,
  payableAmount,
  paymentMethod,
  paymentStep,
  paidAmount,
  paid,
  change,
  suggestedBills,
  loading,
  canConfirmCash,
  canCompleteTransfer,
  transferSubMethod,
  transferNote,
  invoiceVerified,
  formatCurrency,
  onCustomerChange,
  onUpdateQty,
  onDiscountModeChange,
  onDiscountValueChange,
  onPaymentMethodChange,
  onPaidAmountChange,
  onTransferSubMethodChange,
  onTransferNoteChange,
  onConfirmCashAmount,
  onResetPaymentFlow,
  onInvoiceVerifiedChange,
  onVietQrCheckout,
  onCheckout,
}: CartPanelProps) {
  return (
    <div
      className={`app-panel-strong flex min-h-[calc(100dvh-8rem)] flex-col overflow-hidden rounded-t-[2.5rem] lg:h-full lg:min-h-0 lg:w-80 lg:flex-shrink-0 lg:rounded-[2rem] xl:w-96 ${activeTab !== "cart" && "hidden lg:flex"}`}
    >
      <div className="hidden items-center gap-3 border-b border-app bg-app-surface p-6 lg:flex">
        <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
          <ShoppingCart className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-app-strong">Giỏ hàng của bạn</h2>
          <p className="text-[10px] font-bold text-app-soft">{totalItems} sản phẩm đã chọn</p>
        </div>
      </div>

      <div className="border-b border-app bg-app-surface p-4">
        <label className="mb-2 block text-[9px] font-black uppercase tracking-widest text-app-soft">Khách hàng</label>
        <select
          value={selectedCustomerId || ""}
          onChange={(event) => onCustomerChange(event.target.value ? Number(event.target.value) : null)}
          className="app-control w-full py-2 text-xs font-bold"
        >
          <option value="">Khách vãng lai</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.fullName} - {customer.phone}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-app-surface/60 p-4 lg:p-0 lg:py-4">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-20 text-app-soft lg:py-0">
            <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-app-surface shadow-sm">
              <ShoppingCart className="w-10 h-10 opacity-20" />
            </div>
            <p className="font-black text-sm uppercase tracking-widest opacity-50">Giỏ hàng trống</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="relative mx-2 rounded-[2rem] border border-app bg-app-surface p-4 shadow-sm animate-in fade-in slide-in-from-right-5">
              <div className="flex justify-between items-start mb-3">
                <p className="line-clamp-2 pr-8 text-xs font-black leading-tight text-app-strong">{item.name}</p>
                <button
                  onClick={() => onUpdateQty(item.id, -item.qty)}
                  className="absolute top-4 right-4 p-1 text-app-soft transition-colors hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 rounded-2xl bg-[color:var(--surface-3)] p-1">
                  <button onClick={() => onUpdateQty(item.id, -1)} className="touch-target flex items-center justify-center rounded-xl bg-app-surface text-app-muted shadow-sm transition-all active:scale-90 hover:text-app-strong">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-black text-app-strong">{item.qty}</span>
                  <button onClick={() => onUpdateQty(item.id, 1)} className="app-button-primary touch-target flex min-h-0 items-center justify-center rounded-xl p-0 shadow-lg transition-all active:scale-90">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-sm font-black text-blue-600 tracking-tight">{formatCurrency(item.sellPrice * item.qty)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="space-y-6 rounded-t-[2.5rem] border-t border-app bg-app-surface p-6 pb-28 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] lg:rounded-none lg:pb-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center px-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-app-soft">Tạm tính</span>
            <span className="text-sm font-bold text-app-muted">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="rounded-3xl border border-app bg-[color:var(--surface-3)] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-app-soft">Giảm giá</span>
              <div className="grid grid-cols-2 rounded-xl bg-app-surface p-1">
                <button
                  type="button"
                  onClick={() => onDiscountModeChange("amount")}
                  className={`rounded-lg px-2 py-1 text-[10px] font-black ${discountMode === "amount" ? "bg-blue-600 text-white" : "text-app-muted"}`}
                >
                  VND
                </button>
                <button
                  type="button"
                  onClick={() => onDiscountModeChange("percent")}
                  className={`rounded-lg px-2 py-1 text-[10px] font-black ${discountMode === "percent" ? "bg-blue-600 text-white" : "text-app-muted"}`}
                >
                  %
                </button>
              </div>
            </div>
            <input
              type="number"
              min="0"
              max={discountMode === "percent" ? 100 : undefined}
              value={discountValue}
              onChange={(event) => onDiscountValueChange(event.target.value)}
              className="app-control w-full px-3 py-2 text-sm font-black"
              placeholder={discountMode === "percent" ? "VD: 10" : "VD: 50000"}
            />
            {discountAmount > 0 && (
              <p className="mt-2 text-right text-xs font-bold text-blue-600">Đã giảm {formatCurrency(discountAmount)}</p>
            )}
          </div>
          <div className="flex items-center justify-between rounded-3xl border border-blue-100/50 bg-blue-50/50 p-4">
            <span className="text-xs font-black uppercase text-blue-900/60">Tổng thanh toán</span>
            <span className="text-2xl font-black text-blue-600 tracking-tighter">{formatCurrency(payableAmount)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[color:var(--surface-3)] p-1">
          <button
            type="button"
            onClick={() => onPaymentMethodChange("Cash")}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-wider transition-all ${paymentMethod === "Cash" ? "bg-app-surface text-blue-600 shadow-sm" : "text-app-muted"}`}
          >
            <Banknote className="h-4 w-4" />
            Tiền mặt
          </button>
          <button
            type="button"
            onClick={() => onPaymentMethodChange("Transfer")}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-wider transition-all ${paymentMethod === "Transfer" ? "bg-app-surface text-violet-600 shadow-sm" : "text-app-muted"}`}
          >
            <ArrowRightLeft className="h-4 w-4" />
            Chuyển khoản
          </button>
        </div>

        {paymentMethod === "Cash" && paymentStep === "entry" && (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-app-soft">
                  <Banknote className="w-3.5 h-3.5 text-blue-600" /> Khách đưa
                </label>
                <button
                  type="button"
                  onClick={() => onPaidAmountChange(payableAmount.toString())}
                  className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-600 transition-transform active:scale-95"
                >
                  Đưa đủ
                </button>
              </div>
              {suggestedBills.length > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                  {suggestedBills.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => onPaidAmountChange(amount.toString())}
                      className={`min-h-11 flex-1 rounded-2xl border-2 px-4 py-2.5 text-[11px] font-black transition-all active:scale-95 ${Number(paidAmount) === amount ? "border-blue-600 bg-blue-50 text-blue-700" : "border-transparent bg-[color:var(--surface-3)] text-app-muted hover:border-blue-200"}`}
                    >
                      {formatBillLabel(amount)}
                    </button>
                  ))}
                </div>
              )}
              <input
                type="number"
                value={paidAmount}
                onChange={(event) => onPaidAmountChange(event.target.value)}
                className={`w-full rounded-[1.5rem] border-4 px-5 py-4 text-2xl font-black transition-all focus:outline-none ${paid >= payableAmount && paid > 0 ? "border-emerald-500 bg-emerald-50/20" : "border-app bg-[color:var(--surface-3)] focus:border-blue-100"}`}
                placeholder="0"
              />
            </div>

            {paid > 0 && (
              <div className={`flex items-center justify-between rounded-3xl px-5 py-4 animate-in zoom-in-95 ${change >= 0 ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-rose-500 text-white shadow-lg shadow-rose-500/20"}`}>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{change >= 0 ? "Tiền thối dự kiến" : "Còn thiếu"}</span>
                <span className="text-xl font-black">{formatCurrency(Math.abs(change >= 0 ? change : paid - payableAmount))}</span>
              </div>
            )}
          </>
        )}

        {paymentMethod === "Transfer" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[color:var(--surface-3)] p-1">
              <button
                type="button"
                onClick={() => onTransferSubMethodChange("VietQR")}
                className={`flex min-h-10 items-center justify-center gap-2 rounded-xl py-2 text-[10px] font-black uppercase transition-all ${transferSubMethod === "VietQR" ? "bg-app-surface text-violet-600 shadow-sm" : "text-app-muted"}`}
              >
                <ScanLine className="w-3.5 h-3.5" />
                Mã VietQR tự động
              </button>
              <button
                type="button"
                onClick={() => onTransferSubMethodChange("Manual")}
                className={`flex min-h-10 items-center justify-center gap-2 rounded-xl py-2 text-[10px] font-black uppercase transition-all ${transferSubMethod === "Manual" ? "bg-app-surface text-violet-600 shadow-sm" : "text-app-muted"}`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Nhập tay (Manual)
              </button>
            </div>

            {transferSubMethod === "VietQR" ? (
              <>
                <div className="rounded-3xl border border-violet-200 bg-violet-50/50 p-5 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-violet-600">Thanh toán VietQR</p>
                  <p className="mt-1 text-2xl font-black text-violet-900">{formatCurrency(payableAmount)}</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-violet-800/80">
                    Tự động điền tài khoản, số tiền và nội dung bằng mã QR động theo chuẩn NAPAS 24/7.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onVietQrCheckout}
                  disabled={loading || !canCompleteTransfer}
                  className={`w-full rounded-[2rem] py-5 text-sm font-black uppercase tracking-widest transition-all active:scale-[0.97] shadow-2xl ${!canCompleteTransfer ? "bg-[color:var(--surface-3)] text-app-soft shadow-none cursor-not-allowed" : "bg-violet-600 text-white shadow-violet-600/25"}`}
                >
                  {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Tạo VietQR & Đợi Thanh Toán"}
                </button>
              </>
            ) : (
              <>
                <div className="rounded-3xl border border-violet-200 bg-violet-50/50 p-5 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-violet-600">Nhập tay thủ công</p>
                  <p className="mt-1 text-2xl font-black text-violet-900">{formatCurrency(payableAmount)}</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-violet-800/80">
                    Xác nhận chuyển khoản bằng cách đối chiếu thông báo số dư ngân hàng thủ công tại quầy.
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-app-soft">
                    Ghi chú (tuỳ chọn)
                  </label>
                  <input
                    type="text"
                    value={transferNote}
                    onChange={(event) => onTransferNoteChange(event.target.value)}
                    placeholder="VD: Khách CK Vietcombank"
                    className="app-control w-full py-3 text-sm font-bold"
                  />
                </div>
                <button
                  type="button"
                  onClick={onCheckout}
                  disabled={loading || !canCompleteTransfer}
                  className={`w-full rounded-[2rem] py-5 text-sm font-black uppercase tracking-widest transition-all active:scale-[0.97] shadow-2xl ${!canCompleteTransfer ? "bg-[color:var(--surface-3)] text-app-soft shadow-none cursor-not-allowed" : "bg-violet-600 text-white shadow-violet-600/25"}`}
                >
                  {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Ghi nhận thanh toán thường"}
                </button>
              </>
            )}
          </div>
        )}

        {paymentMethod === "Cash" && paymentStep === "entry" ? (
          <button
            type="button"
            onClick={onConfirmCashAmount}
            disabled={!canConfirmCash}
            className={`w-full rounded-[2rem] py-5 text-sm font-black uppercase tracking-widest transition-all active:scale-[0.97] shadow-2xl ${!canConfirmCash ? "bg-[color:var(--surface-3)] text-app-soft shadow-none cursor-not-allowed" : "bg-blue-600 text-white shadow-blue-600/25"}`}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Xác nhận tiền khách đưa
            </span>
          </button>
        ) : paymentMethod === "Cash" ? (
          <>
            <div className="rounded-3xl border-2 border-amber-200 bg-amber-50/80 p-4">
              <div className="mb-3 flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs font-bold leading-5 text-amber-900">
                  Số tiền đã khóa. Quay lại nhập tiền trước khi thối cho khách nếu cần sửa.
                </p>
              </div>
              <div className="flex justify-between text-sm font-bold text-amber-950/70">
                <span>Khách đưa (đã xác nhận)</span>
                <span className="text-lg font-black text-amber-950">{formatCurrency(paid)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-2xl bg-emerald-500 px-4 py-3 text-white">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Tiền thối lại</span>
                <span className="text-xl font-black">{formatCurrency(change)}</span>
              </div>
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-3xl border-2 border-app bg-[color:var(--surface-3)] p-4">
              <input
                type="checkbox"
                checked={invoiceVerified}
                onChange={(event) => onInvoiceVerifiedChange(event.target.checked)}
                className="mt-1 h-5 w-5 rounded border-app accent-blue-600"
              />
              <span className="text-xs font-bold leading-5 text-app-strong">
                Khách đã kiểm tra kỹ hóa đơn trước khi rời quầy.
              </span>
            </label>
            <button
              type="button"
              onClick={onResetPaymentFlow}
              disabled={loading}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-app py-3 text-[10px] font-black uppercase tracking-widest text-app-muted"
            >
              <RotateCcw className="h-4 w-4" />
              Quay lại nhập tiền
            </button>
            <button
              type="button"
              onClick={onCheckout}
              disabled={cart.length === 0 || loading || !invoiceVerified}
              className={`w-full rounded-[2rem] py-5 text-sm font-black uppercase tracking-widest transition-all active:scale-[0.97] shadow-2xl ${cart.length === 0 || !invoiceVerified ? "bg-[color:var(--surface-3)] text-app-soft shadow-none cursor-not-allowed" : "bg-slate-900 text-white shadow-black/20"}`}
            >
              {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Hoàn tất giao dịch"}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
