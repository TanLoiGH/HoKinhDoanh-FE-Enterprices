import api from "@/lib/axios";
import type { Product, ProductForm, ProductListTab } from "./types";
import { hasBarcode } from "./form";

export const fetchNextProductCode = async () => {
  const response = await api.get<{ nextCode: string }>("/products/next-code");
  return response.data.nextCode;
};

export const fetchProductsByTab = async (activeTab: ProductListTab) => {
  const response = await api.get<Product[]>("/products", {
    params: { deletedOnly: activeTab === "trash" },
  });

  return response.data;
};

export const saveProductBarcodeIfNeeded = async (productId: number, form: ProductForm) => {
  const barcode = form.barcode?.trim();
  if (!barcode || hasBarcode(form)) return;

  await api.post("/product-barcodes", {
    productId,
    barcode,
    type: "EAN",
    isPrimary: true,
  });
};
