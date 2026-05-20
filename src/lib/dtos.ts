// DTO shapes as returned by ECommerce.API (System.Text.Json default = PascalCase)

export interface PagedResultDto<T> {
  Items: T[];
  TotalRecords: number;
  PageIndex: number;
  PageSize: number;
}

export interface ProductResponseDto {
  Id: number;
  Name: string;
  Slug: string;
  Price: number;
  ImageUrl?: string | null;
  ShortDesc?: string | null;
  IsFeatured: boolean;
}

export interface VariantDto {
  Id: number;
  SKU: string;
  Price: number;
  AvailableStock: number;
  AttributesInfo: string;
}

export interface ProductDetailResponseDto {
  ProductName: string;
  Slug: string;
  CategoryName: string;
  BrandName?: string | null;
  IsFeatured: boolean;
  DefaultSKU: string;
  DefaultPrice: number;
  DefaultAvailableStock: number;
  Variants: VariantDto[];
  Images: string[];
}

export interface AuthResponseDto {
  Token: string;
  FullName: string;
  Roles: string[];
}

// Thêm vào src/lib/dtos.ts

export interface OrderItemDto {
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderDetailDto {
  orderCode: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalItems: number;
  shippingAddress: string;
  note?: string | null;
  items: OrderItemDto[];
  shippingFee?: number;
}

export interface OrderSummaryDto {
  orderCode: string;
  createdAt: string;
  totalAmount: number;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus: string;
  totalItems: number;
}
export interface DashboardStatsDto {
  todayRevenue: number;
  todayOrders: number;
  lowStockProducts: number;
  grossProfit: number;
  from: string;
  to: string;
  lastUpdated: string;
  revenueChart: { date: string; revenue: number; orderCount: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
}
