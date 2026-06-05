import api from "@/lib/axios";
import type { ProductScanResult } from "./types";

export const scanProduct = async (barcode: string) => {
  const response = await api.get<ProductScanResult>(`/products/scan/${encodeURIComponent(barcode.trim())}`);
  return response.data;
};
