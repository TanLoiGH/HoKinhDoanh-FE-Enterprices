import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/axios";
import Cookies from "js-cookie";

export interface CartItem {
  cartItemId?: number;
  variantId: number;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  image: string;
  attributesInfo: string;
}

interface CartState {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  updateQuantity: (variantId: number, delta: number) => void;
  removeItem: (variantId: number) => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  clearCart: () => void;
  syncCart: () => Promise<void>;
}

// Bọc toàn bộ logic cũ vào trong persist()
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],

      addToCart: (item) => {
        set((state) => {
          const existingItem = state.cart.find(
            (c) => c.variantId === item.variantId,
          );
          if (existingItem) {
            return {
              cart: state.cart.map((c) =>
                c.variantId === item.variantId
                  ? { ...c, quantity: c.quantity + 1 }
                  : c,
              ),
            };
          }
          return { cart: [...state.cart, item] };
        });
      },

      updateQuantity: async (variantId, delta) => {
        const item = get().cart.find((c) => c.variantId === variantId);
        if (!item) return;
        
        const newQuantity = item.quantity + delta;
        const finalQuantity = newQuantity > 0 ? newQuantity : 1;

        if (item.cartItemId && Cookies.get("accessToken")) {
          try {
            await api.put(`/carts/${item.cartItemId}`, { quantity: finalQuantity });
          } catch (error) {
            console.error("Failed to update cart quantity on server", error);
          }
        }

        set((state) => ({
          cart: state.cart.map((c) =>
            c.variantId === variantId ? { ...c, quantity: finalQuantity } : c
          ),
        }));
      },

      removeItem: async (variantId) => {
        // Find cart item ID if synced
        const item = get().cart.find((c) => c.variantId === variantId);
        if (item?.cartItemId && Cookies.get("accessToken")) {
          try {
            await api.delete(`/carts/${item.cartItemId}`);
          } catch (error) {
            console.error("Failed to delete from server cart", error);
          }
        }
        set((state) => ({
          cart: state.cart.filter((item) => item.variantId !== variantId),
        }));
      },

      clearCart: () => set({ cart: [] }),

      syncCart: async () => {
        if (!Cookies.get("accessToken")) return;
        try {
          const res = await api.get("/carts");
          const serverCart = (res.data as Array<{
            id: number;
            variantId: number;
            variantSKU: string;
            productName: string;
            unitPrice: number;
            quantity: number;
            attributesInfo: string;
          }>).map((item) => ({
            cartItemId: item.id,
            variantId: item.variantId,
            productId: item.variantSKU, // Fallback since productId might be slug
            productName: item.productName,
            price: item.unitPrice,
            quantity: item.quantity,
            image: "https://via.placeholder.com/600", // Would ideally come from server
            attributesInfo: item.attributesInfo,
          }));
          set({ cart: serverCart });
        } catch (error) {
          console.error("Failed to sync cart", error);
        }
      },

      getTotalItems: () =>
        get().cart.reduce((total, item) => total + item.quantity, 0),
      getTotalPrice: () =>
        get().cart.reduce(
          (total, item) => total + item.price * item.quantity,
          0,
        ),
    }),
    {
      name: "cart-storage", // Tên key sẽ lưu trong localStorage
    },
  ),
);
