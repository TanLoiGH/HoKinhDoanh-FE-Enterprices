export interface ProductScanResult {
  productId: number;
  productCode: string;
  productName: string;
  unit: string;
  stock: number;
  sellPrice: number;
  costPrice: number;
  barcode: string;
  matchedBy: "barcode" | "product-code" | string;
}
