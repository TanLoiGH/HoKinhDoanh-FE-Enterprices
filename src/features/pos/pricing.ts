import type { CartItem, DiscountMode } from "./types";

const VND_FORMATTER = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

export const formatVnd = (value: number) => VND_FORMATTER.format(value);

export const formatDateTime = (value: string) => new Date(value).toLocaleString("vi-VN");

export const getCartTotal = (cart: CartItem[]) =>
  cart.reduce((sum, item) => sum + item.sellPrice * item.qty, 0);

export const getCartItemCount = (cart: CartItem[]) =>
  cart.reduce((sum, item) => sum + item.qty, 0);

export const getDiscountAmount = (
  totalAmount: number,
  discountMode: DiscountMode,
  discountValue: string,
) => {
  const rawDiscount = Number(discountValue || 0);
  const normalizedDiscount = discountMode === "percent"
    ? Math.round((totalAmount * rawDiscount) / 100)
    : rawDiscount;

  return Math.min(totalAmount, Math.max(0, normalizedDiscount));
};

export const getSuggestedDenominations = (total: number): number[] => {
  const commonBills = [1000, 2000, 5000, 10000, 50000, 100000, 200000, 500000, 1000000];
  let suggestions = commonBills.filter((bill) => bill >= total);

  if (suggestions.length === 0) {
    suggestions = [Math.ceil(total / 100000) * 100000];
  }

  return suggestions.slice(0, 3);
};

export const formatBillLabel = (amount: number) => {
  if (amount >= 1_000_000) return `${amount / 1_000_000}M`;
  if (amount >= 1_000) return `${amount / 1_000}K`;
  return amount.toLocaleString("vi-VN");
};
