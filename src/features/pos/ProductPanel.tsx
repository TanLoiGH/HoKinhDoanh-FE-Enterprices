import { Search, ScanLine, ShoppingCart } from "lucide-react";
import type { CartItem, PosTab, Product } from "./types";

interface ProductPanelProps {
  activeTab: PosTab;
  products: Product[];
  filteredProducts: Product[];
  cart: CartItem[];
  categories: string[];
  activeCategory: string;
  searchTerm: string;
  fetching: boolean;
  usbScanEnabled: boolean;
  totalItems: number;
  payableAmount: number;
  formatCurrency: (value: number) => string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (category: string) => void;
  onUsbScanEnabledChange: (enabled: boolean) => void;
  onOpenScanner: () => void;
  onAddToCart: (product: Product) => void;
  onTabChange: (tab: PosTab) => void;
}

export function ProductPanel({
  activeTab,
  products,
  filteredProducts,
  cart,
  categories,
  activeCategory,
  searchTerm,
  fetching,
  usbScanEnabled,
  totalItems,
  payableAmount,
  formatCurrency,
  onSearchChange,
  onCategoryChange,
  onUsbScanEnabledChange,
  onOpenScanner,
  onAddToCart,
  onTabChange,
}: ProductPanelProps) {
  return (
    <div className={`flex-1 flex flex-col gap-3 md:gap-4 min-w-0 px-3 lg:px-0 ${activeTab !== "products" && "hidden lg:flex"}`}>
      <div className="hidden lg:block">
        <p className="app-kicker mb-2">Điểm bán hàng</p>
        <h1 className="app-title text-2xl font-black tracking-tight">Bán hàng</h1>
        <p className="mt-1 text-sm font-semibold text-app-muted">{products.length} sản phẩm có sẵn</p>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-app-soft group-focus-within:text-blue-600 transition-colors" />
        <input
          type="text"
          placeholder="Tìm món nhanh..."
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          className="app-control w-full py-3.5 pl-11 pr-4 text-sm font-bold shadow-sm"
        />
        <button
          type="button"
          onClick={onOpenScanner}
          className="app-button-primary absolute right-2 top-1/2 flex h-10 min-h-10 w-10 -translate-y-1/2 items-center justify-center rounded-2xl p-0 transition-all"
          aria-label="Mở camera quét mã"
        >
          <ScanLine className="h-4 w-4" />
        </button>
      </div>

      <label className="app-panel-subtle flex min-h-11 items-center justify-between gap-3 rounded-2xl px-4 text-xs font-bold text-app-muted">
        <span>
          USB barcode scanner
          <span className="ml-2 font-black text-app-strong">{usbScanEnabled ? "đang bật" : "đang tắt"}</span>
        </span>
        <input
          type="checkbox"
          checked={usbScanEnabled}
          onChange={(event) => onUsbScanEnabledChange(event.target.checked)}
          className="h-5 w-5 accent-blue-600"
        />
      </label>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`min-h-11 flex-shrink-0 whitespace-nowrap rounded-2xl border-2 px-5 py-2.5 text-xs font-black transition-all ${activeCategory === category ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-app-surface border-transparent text-app-muted hover:border-app"}`}
          >
            {category?.toUpperCase() || ""}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-40 lg:pb-4 pr-1">
        {fetching ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-3xl bg-[color:var(--surface-3)]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const inCart = cart.find((item) => item.id === product.id);

              return (
                <button
                  key={product.id}
                  onClick={() => onAddToCart(product)}
                  disabled={product.stock <= 0}
                  className={`relative min-h-36 rounded-3xl border-2 p-4 text-left transition-all duration-300 active:scale-95 ${inCart ? "border-blue-600 bg-blue-50/50" : "border-app bg-app-surface shadow-sm hover:shadow-md"} ${product.stock <= 0 ? "opacity-50 grayscale cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {inCart && (
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-blue-600 text-white text-xs rounded-xl flex items-center justify-center font-black shadow-lg shadow-blue-600/30 border-2 border-white animate-in zoom-in-50">
                      {inCart.qty}
                    </div>
                  )}
                  <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-app-soft">{product.code}</p>
                  <p className="mb-4 min-h-[2.2rem] line-clamp-2 text-xs font-black leading-tight text-app-strong">{product.name}</p>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-sm font-black text-blue-600">{formatCurrency(product.sellPrice)}</p>
                    <div className={`w-2 h-2 rounded-full ${product.stock > 5 ? "bg-green-500" : product.stock > 0 ? "bg-orange-500" : "bg-red-500"}`} title={`Kho: ${product.stock}`} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {totalItems > 0 && activeTab === "products" && (
        <div className="fixed bottom-24 left-4 right-4 z-30 animate-in slide-in-from-bottom-10 lg:hidden">
          <button
            onClick={() => onTabChange("cart")}
            className="flex w-full items-center justify-between rounded-3xl bg-slate-900 p-4 text-white shadow-2xl shadow-black/20 transition-transform active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{totalItems} sản phẩm</p>
                <p className="text-base font-black">{formatCurrency(payableAmount)}</p>
              </div>
            </div>
            <div className="bg-blue-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider">
              XEM GIỎ HÀNG
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
