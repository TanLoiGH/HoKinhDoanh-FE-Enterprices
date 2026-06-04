export type PosPaymentMethod = "Cash" | "Transfer";
export type DiscountMode = "amount" | "percent";
export type PosTab = "products" | "cart";
export type PaymentStep = "entry" | "confirm";
export type TransferSubMethod = "VietQR" | "Manual";

export interface ProductBarcode {
  barcode: string;
  type: string;
  isPrimary: boolean;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  categoryId: number;
  categoryName: string;
  sellPrice: number;
  stock: number;
  barcodes?: ProductBarcode[];
}

export interface CartItem extends Product {
  qty: number;
}

export interface OrderReceipt {
  id: number;
  code: string;
  createdAt: string;
  totalAmount: number;
  discount: number;
  paidAmount: number;
  paymentMethod: string;
  paymentReference?: string | null;
  cashierName: string;
  branchName: string;
  items: Array<{
    productCode: string;
    productName: string;
    qty: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

export interface Customer {
  id: number;
  fullName: string;
  phone: string;
}

export interface ReceiptDeliveryStatus {
  isConfigured: boolean;
  defaultProvider: string;
}

export interface PendingVietQrOrder {
  id: number;
  code: string;
  amount: number;
  qrUrl: string;
}
