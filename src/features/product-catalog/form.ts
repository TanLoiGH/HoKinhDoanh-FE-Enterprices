import type { Product, ProductForm } from "./types";

export const emptyProductForm: ProductForm = {
  code: "",
  name: "",
  categoryId: 1,
  unit: "",
  costPrice: 0,
  sellPrice: 0,
  minStock: 5,
  barcode: "",
};

export const getPrimaryBarcode = (product: Product) =>
  product.barcodes?.find((barcode) => barcode.isPrimary) ?? product.barcodes?.[0];

export const createEditProductForm = (product: Product): ProductForm => ({
  ...product,
  barcode: getPrimaryBarcode(product)?.barcode ?? "",
});

export const hasBarcode = (productForm: ProductForm) => {
  const nextBarcode = productForm.barcode?.trim();
  if (!nextBarcode) return false;

  return Boolean(productForm.barcodes?.some((barcode) => barcode.barcode === nextBarcode));
};
