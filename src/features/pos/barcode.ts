import type { Product } from "./types";

export const normalizeBarcode = (value: string) => value.trim().toLowerCase();

export const findProductByScannedCode = (products: Product[], rawValue: string) => {
  const normalized = normalizeBarcode(rawValue);
  if (!normalized) return undefined;

  return products.find((product) =>
    normalizeBarcode(product.code) === normalized
    || product.barcodes?.some((barcode) => normalizeBarcode(barcode.barcode) === normalized)
  );
};
