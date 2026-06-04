export interface Category {
  id: number;
  name: string;
}

export interface ProductBarcode {
  id: number;
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
  unit: string;
  costPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  barcodes?: ProductBarcode[];
}

export type ProductForm = Omit<Product, "id" | "stock" | "categoryName"> & {
  id?: number;
  barcode?: string;
};

export type ProductListTab = "active" | "trash";
