"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Heart } from "lucide-react";
import type { Product } from "@/lib/mappers";
import { useWishlistStore } from "@/store/useWishlistStore";
import toast from "react-hot-toast";

export default function ProductCard({ product }: { product: Product }) {
  const { items, addItem, removeItem } = useWishlistStore();
  
  // Kiểm tra xem sản phẩm đã có trong wishlist chưa
  const isInWishlist = items.some((item) => item.id === product.id);

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isInWishlist) {
      removeItem(product.id);
      toast.success("Đã gỡ khỏi danh sách yêu thích");
    } else {
      addItem(product);
      toast.success("Đã thêm vào danh sách yêu thích");
    }
  };

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 flex flex-col transform hover:-translate-y-1 relative">
      {/* Wishlist Button */}
      <button 
        onClick={toggleWishlist}
        className="absolute top-3 right-3 z-10 p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm hover:bg-red-50 transition-colors"
      >
        <Heart 
          className={`w-5 h-5 transition-colors ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-500'}`} 
        />
      </button>

      <div className="relative w-full h-64 overflow-hidden bg-gray-50">
        <Image
          src={product.imageUrl || "https://via.placeholder.com/400"}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
        {/* Badge */}
        {product.price && product.price < 500000 && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-sm">
            HOT
          </span>
        )}
        {/* Quick Add Button overlay */}
        <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
          <Link href={`/products/${product.slug}`} className="w-full flex items-center justify-center gap-2 bg-white/90 backdrop-blur-sm text-gray-900 font-bold py-2.5 rounded-xl hover:bg-blue-600 hover:text-white transition-colors shadow-lg">
            <ShoppingCart className="w-5 h-5" />
            Xem Chi Tiết
          </Link>
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="font-bold text-gray-800 text-lg leading-tight line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
          <Link href={`/products/${product.slug}`}>
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-end justify-between">
          <div>
            <p className="text-gray-400 text-sm line-through decoration-gray-300">
              {product.price ? (product.price * 1.2).toLocaleString("vi-VN") : ""} đ
            </p>
            <p className="text-red-600 font-black text-xl">
              {product.price?.toLocaleString("vi-VN") ?? "Liên hệ"} <span className="text-base font-bold">đ</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
