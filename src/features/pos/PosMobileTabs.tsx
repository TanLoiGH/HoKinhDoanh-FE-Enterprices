import { Package, ShoppingCart } from "lucide-react";
import type { PosTab } from "./types";

interface PosMobileTabsProps {
  activeTab: PosTab;
  totalItems: number;
  onTabChange: (tab: PosTab) => void;
}

export function PosMobileTabs({ activeTab, totalItems, onTabChange }: PosMobileTabsProps) {
  return (
    <div className="app-panel sticky top-0 z-20 mx-3 mt-1 flex rounded-2xl p-1 lg:hidden">
      <button
        onClick={() => onTabChange("products")}
        className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl py-2 text-[10px] font-black transition-all ${activeTab === "products" ? "bg-app-surface text-blue-600 shadow-sm" : "text-app-muted"}`}
      >
        <Package className="w-3.5 h-3.5" /> THỰC ĐƠN
      </button>
      <button
        onClick={() => onTabChange("cart")}
        className={`relative flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl py-2 text-[10px] font-black transition-all ${activeTab === "cart" ? "bg-app-surface text-blue-600 shadow-sm" : "text-app-muted"}`}
      >
        <ShoppingCart className="w-3.5 h-3.5" /> GIỎ HÀNG
        {totalItems > 0 && (
          <span className="absolute top-1 right-2 w-4 h-4 bg-red-600 text-white text-[8px] rounded-full flex items-center justify-center border border-white font-black">
            {totalItems}
          </span>
        )}
      </button>
    </div>
  );
}
