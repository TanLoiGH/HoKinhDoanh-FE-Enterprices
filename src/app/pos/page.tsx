"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { ShoppingCart, Search, Trash2, Plus, Minus, Banknote, Package, Loader2, Printer, X, ScanLine, Camera, ShieldCheck, AlertCircle, RotateCcw, ArrowRightLeft } from "lucide-react";

type PosPaymentMethod = "Cash" | "Transfer";

interface Product {
  id: number;
  code: string;
  name: string;
  categoryId: number;
  categoryName: string;
  sellPrice: number;
  stock: number;
}

interface CartItem extends Product {
  qty: number;
}

interface OrderReceipt {
  id: number;
  code: string;
  createdAt: string;
  totalAmount: number;
  discount: number;
  paidAmount: number;
  paymentMethod: string;
  paymentReference?: string | null;
  cashierName: string;
  branchName: string;
  items: Array<{
    productCode: string;
    productName: string;
    qty: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

interface Customer {
  id: number;
  fullName: string;
  phone: string;
}

const getSuggestedDenominations = (total: number): number[] => {
  const commonBills = [1000, 2000, 5000, 10000, 50000, 100000, 200000, 500000, 1000000];
  let suggestions = commonBills.filter((bill) => bill >= total);
  if (suggestions.length === 0) {
    const nearest = Math.ceil(total / 100000) * 100000;
    suggestions = [nearest];
  }
  return suggestions.slice(0, 3);
};

const formatBillLabel = (amt: number) => {
  if (amt >= 1_000_000) return `${amt / 1_000_000}M`;
  if (amt >= 1_000) return `${amt / 1_000}K`;
  return amt.toLocaleString("vi-VN");
};

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMessage, setScannerMessage] = useState("Đưa mã vạch vào giữa khung quét.");

  const [activeTab, setActiveTab] = useState<"products" | "cart">("products");
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>("Cash");
  const [paymentStep, setPaymentStep] = useState<"entry" | "confirm">("entry");
  const [lockedPaidAmount, setLockedPaidAmount] = useState<number | null>(null);
  const [invoiceVerified, setInvoiceVerified] = useState(false);
  const [transferNote, setTransferNote] = useState("");
  const [transferSubMethod, setTransferSubMethod] = useState<"VietQR" | "Manual">("VietQR");
  const [vietQrModalOpen, setVietQrModalOpen] = useState(false);
  const [currentPendingOrder, setCurrentPendingOrder] = useState<{ id: number; code: string; amount: number; qrUrl: string } | null>(null);

  const fetchProducts = async () => {
    setFetching(true);
    try {
      const response = await api.get<Product[]>("/products");
      setProducts(response.data);
    } catch (error) {
      console.error("Lỗi tải sản phẩm:", error);
    } finally {
      setFetching(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get<Customer[]>("/customers");
      setCustomers(response.data);
    } catch (error) {
      console.error("Lỗi tải khách hàng:", error);
    }
  };

  useEffect(() => {
    void fetchProducts();
    void fetchCustomers();
  }, []);

  useEffect(() => {
    const handleRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ type: string }>).detail;
      if (detail?.type === "inventoryChanged" || detail?.type === "catalogChanged") {
        void fetchProducts();
      }
    };

    window.addEventListener("hkd:realtime", handleRealtime as EventListener);
    return () => window.removeEventListener("hkd:realtime", handleRealtime as EventListener);
  }, []);



  const categories = ["Tất cả", ...Array.from(new Set(products.map(p => p.categoryName || "Khác")))];

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = activeCategory === "Tất cả" || p.categoryName === activeCategory;
    return matchSearch && matchCat;
  });

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  useEffect(() => {
    if (!isScannerOpen) return;

    let stream: MediaStream | null = null;
    let animationFrame = 0;
    let stopped = false;
    let lastDetected = "";
    let lastDetectedAt = 0;
    const video = document.getElementById("barcode-scanner-video") as HTMLVideoElement | null;
    const DetectorCtor = (window as Window & {
      BarcodeDetector?: new (options?: { formats?: string[] }) => {
        detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
      };
    }).BarcodeDetector;

    const stopScanner = () => {
      stopped = true;
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      stream?.getTracks().forEach((track) => track.stop());
    };

    const handleCode = (rawValue: string) => {
      const normalized = rawValue.trim().toLowerCase();
      const now = Date.now();
      if (!normalized || (normalized === lastDetected && now - lastDetectedAt < 2000)) {
        return;
      }

      lastDetected = normalized;
      lastDetectedAt = now;

      const matchedProduct = products.find((product) => product.code.trim().toLowerCase() === normalized);
      if (!matchedProduct) {
        setScannerMessage(`Không tìm thấy mã: ${rawValue}`);
        return;
      }

      addToCart(matchedProduct);
      setScannerMessage(`Đã thêm ${matchedProduct.name}`);
    };

    const startScanner = async () => {
      if (!DetectorCtor) {
        setScannerMessage("Trình duyệt này chưa hỗ trợ BarcodeDetector. Anh có thể tìm theo mã trong ô tìm kiếm.");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        if (!video) {
          setScannerMessage("Không khởi tạo được camera.");
          return;
        }

        video.srcObject = stream;
        await video.play();

        const detector = new DetectorCtor({
          formats: ["code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e", "qr_code"],
        });

        const detectFrame = async () => {
          if (stopped || !video || video.readyState < 2) {
            animationFrame = requestAnimationFrame(() => { void detectFrame(); });
            return;
          }

          try {
            const codes = await detector.detect(video);
            const firstCode = codes.find((code) => code.rawValue)?.rawValue;
            if (firstCode) {
              handleCode(firstCode);
            }
          } catch {
            setScannerMessage("Không đọc được mã. Hãy giữ máy ổn định hơn.");
          }

          animationFrame = requestAnimationFrame(() => { void detectFrame(); });
        };

        animationFrame = requestAnimationFrame(() => { void detectFrame(); });
      } catch {
        setScannerMessage("Không truy cập được camera. Hãy cấp quyền camera cho trình duyệt.");
      }
    };

    void startScanner();

    return () => {
      stopScanner();
    };
  }, [isScannerOpen, products]);

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev
      .map(item => item.id === id ? { ...item, qty: item.qty + delta } : item)
      .filter(item => item.qty > 0)
    );
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.sellPrice * item.qty, 0);

  // Auto-fill paidAmount when total changes
  useEffect(() => {
    void Promise.resolve().then(() => {
      if (totalAmount > 0 && (!paidAmount || Number(paidAmount) === 0)) {
        setPaidAmount(totalAmount.toString());
      } else if (totalAmount === 0 && paidAmount) {
        setPaidAmount("");
      }
    });
  }, [totalAmount, paidAmount]);

  const paid = paymentStep === "confirm" && lockedPaidAmount != null
    ? lockedPaidAmount
    : Number(paidAmount || 0);
  const change = Math.max(0, paid - totalAmount);
  const canConfirmCash = cart.length > 0 && paid >= totalAmount && totalAmount > 0;
  const suggestedBills = useMemo(
    () => (totalAmount > 0 ? getSuggestedDenominations(totalAmount) : []),
    [totalAmount],
  );
  const totalItems = cart.reduce((s, i) => s + i.qty, 0);

  const resetPaymentFlow = () => {
    setPaymentStep("entry");
    setLockedPaidAmount(null);
    setInvoiceVerified(false);
  };

  const switchPaymentMethod = (method: PosPaymentMethod) => {
    setPaymentMethod(method);
    resetPaymentFlow();
  };

  const canCompleteTransfer = cart.length > 0 && totalAmount > 0;

  const confirmCashAmount = () => {
    if (cart.length === 0 || paid < totalAmount) return;
    setLockedPaidAmount(paid);
    setPaymentStep("confirm");
    setInvoiceVerified(false);
  };

  const playSuccessChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
      gain1.gain.setValueAtTime(0.15, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.15);
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.1);
      gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc2.start(ctx.currentTime + 0.1);
      osc2.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn("Chime audio error:", e);
    }
  };

  // Lắng nghe SignalR để tự động cập nhật & hoàn tất đơn hàng VietQR theo thời gian thực
  useEffect(() => {
    if (!currentPendingOrder || !vietQrModalOpen) return;

    const checkOrderStatus = async () => {
      try {
        const res = await api.get<OrderReceipt>(`/orders/${currentPendingOrder.id}`);
        if (res.data && res.data.paidAmount >= currentPendingOrder.amount) {
          // Kích hoạt âm thanh thành công
          playSuccessChime();
          // Cập nhật hóa đơn hoàn tất để in bill
          setReceipt(res.data);
          // Đóng cửa sổ QR và dọn dẹp giỏ hàng
          setVietQrModalOpen(false);
          setCurrentPendingOrder(null);
          setCart([]);
          setPaidAmount("");
          resetPaymentFlow();
          void fetchProducts();
        }
      } catch (err) {
        console.error("Lỗi tự động kiểm tra trạng thái đơn hàng:", err);
      }
    };

    const handleRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ type: string }>).detail;
      if (detail?.type === "inventoryChanged" || detail?.type === "cashFlowChanged" || detail?.type === "dashboardChanged") {
        void checkOrderStatus();
      }
    };

    window.addEventListener("hkd:realtime", handleRealtime as EventListener);
    return () => window.removeEventListener("hkd:realtime", handleRealtime as EventListener);
  }, [currentPendingOrder, vietQrModalOpen]);

  const handleVietQrCheckout = async () => {
    if (cart.length === 0 || totalAmount <= 0) return;

    setLoading(true);
    try {
      // 1. Tạo đơn hàng dưới dạng Pending bằng cách chọn provider VNPay
      const createResponse = await api.post<number>("/orders", {
        discount: 0,
        paidAmount: 0,
        paymentMethod: "Transfer",
        cashAmountConfirmed: false,
        paymentProvider: "VNPay",
        customerId: selectedCustomerId,
        items: cart.map(item => ({ productId: item.id, qty: item.qty })),
      });
      const orderId = createResponse.data;

      // 2. Lấy liên kết VietQR động được tạo bởi backend
      const qrResponse = await api.get<{ qrUrl: string; orderCode: string }>(`/payments/vietqr/${orderId}`);
      
      setCurrentPendingOrder({
        id: orderId,
        code: qrResponse.data.orderCode,
        amount: totalAmount,
        qrUrl: qrResponse.data.qrUrl
      });
      setVietQrModalOpen(true);
    } catch (error: unknown) {
      console.error("Lỗi tạo đơn hàng VietQR:", error);
      const e = error as { response?: { data?: string } };
      toast.error(e.response?.data || "Lỗi tạo đơn hàng VietQR");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || totalAmount <= 0) return;

    if (paymentMethod !== "Transfer") {
      const finalPaid = lockedPaidAmount ?? paid;
      if (finalPaid < totalAmount || paymentStep !== "confirm" || !invoiceVerified) return;
    }

    setLoading(true);
    try {
      const isTransfer = paymentMethod === "Transfer";
      const createResponse = await api.post<number>("/orders", {
        discount: 0,
        paidAmount: isTransfer ? totalAmount : (lockedPaidAmount ?? paid),
        paymentMethod: isTransfer ? "Transfer" : "Cash",
        cashAmountConfirmed: !isTransfer,
        paymentReference: isTransfer && transferNote.trim() ? transferNote.trim() : undefined,
        paymentProvider: isTransfer ? "Manual" : undefined,
        customerId: selectedCustomerId,
        items: cart.map(item => ({ productId: item.id, qty: item.qty })),
      });
      const receiptResponse = await api.get<OrderReceipt>(`/orders/${createResponse.data}`);
      setReceipt(receiptResponse.data);
      setCart([]);
      setPaidAmount("");
      setTransferNote("");
      resetPaymentFlow();
      toast.success("Thanh toán thành công!");
      fetchProducts();
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setActiveTab("products");
      }
    } catch (error: unknown) {
      const e = error as { response?: { data?: string }; isQueuedOffline?: boolean };
      toast.error(e.isQueuedOffline ? "Mất mạng: đơn hàng đã được xếp hàng chờ đồng bộ, chưa thể in bill cho tới khi có mạng." : (e.response?.data || "Lỗi thanh toán"));
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
  const formatDateTime = (value: string) => new Date(value).toLocaleString("vi-VN");
  const receiptPaid = receipt?.paidAmount || 0;
  const receiptDue = receipt ? Math.max(0, receipt.totalAmount - receipt.discount) : 0;
  const receiptChange = Math.max(0, receiptPaid - receiptDue);

  const printReceipt = () => {
    if (!receipt) return;
    window.open(`/receipt/${receipt.id}?autoprint=1`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="relative -m-3 flex min-h-[calc(100dvh-8rem)] flex-col gap-4 md:m-0 lg:min-h-0 lg:flex-row">
      {/* ─── Mobile View Toggle ─── */}
      <div className="app-panel sticky top-0 z-20 mx-3 mt-1 flex rounded-2xl p-1 lg:hidden">
        <button
          onClick={() => setActiveTab("products")}
          className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl py-2 text-[10px] font-black transition-all ${activeTab === 'products' ? 'bg-app-surface text-blue-600 shadow-sm' : 'text-app-muted'}`}
        >
          <Package className="w-3.5 h-3.5" /> THỰC ĐƠN
        </button>
        <button
          onClick={() => setActiveTab("cart")}
          className={`relative flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl py-2 text-[10px] font-black transition-all ${activeTab === 'cart' ? 'bg-app-surface text-blue-600 shadow-sm' : 'text-app-muted'}`}
        >
          <ShoppingCart className="w-3.5 h-3.5" /> GIỎ HÀNG
          {totalItems > 0 && (
            <span className="absolute top-1 right-2 w-4 h-4 bg-red-600 text-white text-[8px] rounded-full flex items-center justify-center border border-white font-black">
              {totalItems}
            </span>
          )}
        </button>
      </div>

      {/* ─── Left: Product Panel ─── */}
      <div className={`flex-1 flex flex-col gap-3 md:gap-4 min-w-0 px-3 lg:px-0 ${activeTab !== 'products' && 'hidden lg:flex'}`}>
        {/* Header (Desktop Only) */}
        <div className="hidden lg:block">
          <p className="app-kicker mb-2">Điểm bán hàng</p>
          <h1 className="app-title text-2xl font-black tracking-tight">Bán hàng</h1>
          <p className="mt-1 text-sm font-semibold text-app-muted">{products.length} sản phẩm có sẵn</p>
        </div>

        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-app-soft group-focus-within:text-blue-600 transition-colors" />
          <input
            type="text"
            placeholder="Tìm món nhanh..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="app-control w-full py-3.5 pl-11 pr-4 text-sm font-bold shadow-sm"
          />
          <button
            type="button"
            onClick={() => {
              setScannerMessage("Đưa mã vạch vào giữa khung quét.");
              setIsScannerOpen(true);
            }}
            className="app-button-primary absolute right-2 top-1/2 flex h-10 min-h-10 w-10 -translate-y-1/2 items-center justify-center rounded-2xl p-0 transition-all"
            aria-label="Mở camera quét mã"
          >
            <ScanLine className="h-4 w-4" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`min-h-11 flex-shrink-0 whitespace-nowrap rounded-2xl border-2 px-5 py-2.5 text-xs font-black transition-all ${activeCategory === cat ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-app-surface border-transparent text-app-muted hover:border-app'
                }`}
            >
              {cat?.toUpperCase() || ""}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto pb-40 lg:pb-4 pr-1">
          {fetching ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-3xl bg-[color:var(--surface-3)]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map(p => {
                const inCart = cart.find(c => c.id === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={p.stock <= 0}
                    className={`relative min-h-36 rounded-3xl border-2 p-4 text-left transition-all duration-300 active:scale-95 ${inCart ? 'border-blue-600 bg-blue-50/50' : 'border-app bg-app-surface shadow-sm hover:shadow-md'
                      } ${p.stock <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {inCart && (
                      <div className="absolute -top-2 -right-2 w-7 h-7 bg-blue-600 text-white text-xs rounded-xl flex items-center justify-center font-black shadow-lg shadow-blue-600/30 border-2 border-white animate-in zoom-in-50">
                        {inCart.qty}
                      </div>
                    )}
                    <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-app-soft">{p.code}</p>
                    <p className="mb-4 min-h-[2.2rem] line-clamp-2 text-xs font-black leading-tight text-app-strong">{p.name}</p>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-black text-blue-600">{fmt(p.sellPrice)}</p>
                      <div className={`w-2 h-2 rounded-full ${p.stock > 5 ? 'bg-green-500' : p.stock > 0 ? 'bg-orange-500' : 'bg-red-500'}`} title={`Kho: ${p.stock}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Mobile Sticky Summary Bar */}
        {totalItems > 0 && activeTab === 'products' && (
          <div className="fixed bottom-24 left-4 right-4 z-30 animate-in slide-in-from-bottom-10 lg:hidden">
            <button
              onClick={() => setActiveTab("cart")}
              className="flex w-full items-center justify-between rounded-3xl bg-slate-900 p-4 text-white shadow-2xl shadow-black/20 transition-transform active:scale-95"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{totalItems} sản phẩm</p>
                  <p className="text-base font-black">{fmt(totalAmount)}</p>
                </div>
              </div>
              <div className="bg-blue-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider">
                XEM GIỎ HÀNG
              </div>
            </button>
          </div>
        )}
      </div>

      {/* ─── Right: Cart Panel ─── */}
      <div
        className={`app-panel-strong flex min-h-[calc(100dvh-8rem)] flex-col overflow-hidden rounded-t-[2.5rem] lg:h-full lg:min-h-0 lg:w-80 lg:flex-shrink-0 lg:rounded-[2rem] xl:w-96 ${activeTab !== 'cart' && 'hidden lg:flex'}`}
      >
        {/* Cart Header */}
        <div className="hidden items-center gap-3 border-b border-app bg-app-surface p-6 lg:flex">
          <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-app-strong">Giỏ hàng của bạn</h2>
            <p className="text-[10px] font-bold text-app-soft">{totalItems} sản phẩm đã chọn</p>
          </div>
        </div>

        {/* Customer Selection */}
        <div className="border-b border-app bg-app-surface p-4">
          <label className="mb-2 block text-[9px] font-black uppercase tracking-widest text-app-soft">Khách hàng</label>
          <select
            value={selectedCustomerId || ""}
            onChange={e => setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)}
            className="app-control w-full py-2 text-xs font-bold"
          >
            <option value="">Khách vãng lai</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.fullName} - {c.phone}</option>
            ))}
          </select>
        </div>

        {/* Cart Items */}
        <div className="flex-1 space-y-3 overflow-y-auto bg-app-surface/60 p-4 lg:p-0 lg:py-4">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-20 text-app-soft lg:py-0">
              <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-app-surface shadow-sm">
                <ShoppingCart className="w-10 h-10 opacity-20" />
              </div>
              <p className="font-black text-sm uppercase tracking-widest opacity-50">Giỏ hàng trống</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="relative mx-2 rounded-[2rem] border border-app bg-app-surface p-4 shadow-sm animate-in fade-in slide-in-from-right-5">
                <div className="flex justify-between items-start mb-3">
                  <p className="line-clamp-2 pr-8 text-xs font-black leading-tight text-app-strong">{item.name}</p>
                  <button
                    onClick={() => updateQty(item.id, -item.qty)}
                    className="absolute top-4 right-4 p-1 text-app-soft transition-colors hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-2xl bg-[color:var(--surface-3)] p-1">
                    <button onClick={() => updateQty(item.id, -1)} className="touch-target flex items-center justify-center rounded-xl bg-app-surface text-app-muted shadow-sm transition-all active:scale-90 hover:text-app-strong">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-black text-app-strong">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="app-button-primary touch-target flex min-h-0 items-center justify-center rounded-xl p-0 shadow-lg transition-all active:scale-90">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-sm font-black text-blue-600 tracking-tight">{fmt(item.sellPrice * item.qty)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment Panel */}
        <div className="space-y-6 rounded-t-[2.5rem] border-t border-app bg-app-surface p-6 pb-28 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] lg:rounded-none lg:pb-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center px-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-app-soft">Tạm tính</span>
              <span className="text-sm font-bold text-app-muted">{fmt(totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between rounded-3xl border border-blue-100/50 bg-blue-50/50 p-4">
              <span className="text-xs font-black uppercase text-blue-900/60">Tổng thanh toán</span>
              <span className="text-2xl font-black text-blue-600 tracking-tighter">{fmt(totalAmount)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[color:var(--surface-3)] p-1">
            <button
              type="button"
              onClick={() => switchPaymentMethod("Cash")}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                paymentMethod === "Cash" ? "bg-app-surface text-blue-600 shadow-sm" : "text-app-muted"
              }`}
            >
              <Banknote className="h-4 w-4" />
              Tiền mặt
            </button>
            <button
              type="button"
              onClick={() => switchPaymentMethod("Transfer")}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                paymentMethod === "Transfer" ? "bg-app-surface text-violet-600 shadow-sm" : "text-app-muted"
              }`}
            >
              <ArrowRightLeft className="h-4 w-4" />
              Chuyển khoản
            </button>
          </div>

          {paymentMethod === "Cash" && paymentStep === "entry" && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-app-soft">
                    <Banknote className="w-3.5 h-3.5 text-blue-600" /> Khách đưa
                  </label>
                  <button
                    type="button"
                    onClick={() => setPaidAmount(totalAmount.toString())}
                    className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-600 transition-transform active:scale-95"
                  >
                    Đưa đủ
                  </button>
                </div>
                {suggestedBills.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {suggestedBills.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setPaidAmount(amt.toString())}
                        className={`min-h-11 flex-1 rounded-2xl border-2 px-4 py-2.5 text-[11px] font-black transition-all active:scale-95 ${
                          Number(paidAmount) === amt
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-transparent bg-[color:var(--surface-3)] text-app-muted hover:border-blue-200"
                        }`}
                      >
                        {formatBillLabel(amt)}
                      </button>
                    ))}
                  </div>
                )}
                <input
                  type="number"
                  value={paidAmount}
                  onChange={e => setPaidAmount(e.target.value)}
                  className={`w-full rounded-[1.5rem] border-4 px-5 py-4 text-2xl font-black transition-all focus:outline-none ${paid >= totalAmount && paid > 0 ? 'border-emerald-500 bg-emerald-50/20' : 'border-app bg-[color:var(--surface-3)] focus:border-blue-100'}`}
                  placeholder="0"
                />
              </div>

              {paid > 0 && (
                <div className={`flex items-center justify-between rounded-3xl px-5 py-4 animate-in zoom-in-95 ${change >= 0 ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-rose-500 text-white shadow-lg shadow-rose-500/20"}`}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{change >= 0 ? "Tiền thối dự kiến" : "Còn thiếu"}</span>
                  <span className="text-xl font-black">{fmt(Math.abs(change >= 0 ? change : paid - totalAmount))}</span>
                </div>
              )}
            </>
          )}

          {paymentMethod === "Transfer" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[color:var(--surface-3)] p-1">
                <button
                  type="button"
                  onClick={() => setTransferSubMethod("VietQR")}
                  className={`flex min-h-10 items-center justify-center gap-2 rounded-xl py-2 text-[10px] font-black uppercase transition-all ${
                    transferSubMethod === "VietQR" ? "bg-app-surface text-violet-600 shadow-sm" : "text-app-muted"
                  }`}
                >
                  <ScanLine className="w-3.5 h-3.5" />
                  Mã VietQR tự động
                </button>
                <button
                  type="button"
                  onClick={() => setTransferSubMethod("Manual")}
                  className={`flex min-h-10 items-center justify-center gap-2 rounded-xl py-2 text-[10px] font-black uppercase transition-all ${
                    transferSubMethod === "Manual" ? "bg-app-surface text-violet-600 shadow-sm" : "text-app-muted"
                  }`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Nhập tay (Manual)
                </button>
              </div>

              {transferSubMethod === "VietQR" ? (
                <>
                  <div className="rounded-3xl border border-violet-200 bg-violet-50/50 p-5 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-violet-600">Thanh toán VietQR</p>
                    <p className="mt-1 text-2xl font-black text-violet-900">{fmt(totalAmount)}</p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-violet-800/80">
                      Tự động điền tài khoản, số tiền và nội dung bằng mã QR động theo chuẩn NAPAS 24/7.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleVietQrCheckout}
                    disabled={loading || !canCompleteTransfer}
                    className={`w-full rounded-[2rem] py-5 text-sm font-black uppercase tracking-widest transition-all active:scale-[0.97] shadow-2xl ${
                      !canCompleteTransfer ? "bg-[color:var(--surface-3)] text-app-soft shadow-none cursor-not-allowed" : "bg-violet-600 text-white shadow-violet-600/25"
                    }`}
                  >
                    {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Tạo VietQR & Đợi Thanh Toán"}
                  </button>
                </>
              ) : (
                <>
                  <div className="rounded-3xl border border-violet-200 bg-violet-50/50 p-5 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-violet-600">Nhập tay thủ công</p>
                    <p className="mt-1 text-2xl font-black text-violet-900">{fmt(totalAmount)}</p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-violet-800/80">
                      Xác nhận chuyển khoản bằng cách đối chiếu thông báo số dư ngân hàng thủ công tại quầy.
                    </p>
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-app-soft">
                      Ghi chú (tuỳ chọn)
                    </label>
                    <input
                      type="text"
                      value={transferNote}
                      onChange={(e) => setTransferNote(e.target.value)}
                      placeholder="VD: Khách CK Vietcombank"
                      className="app-control w-full py-3 text-sm font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={loading || !canCompleteTransfer}
                    className={`w-full rounded-[2rem] py-5 text-sm font-black uppercase tracking-widest transition-all active:scale-[0.97] shadow-2xl ${
                      !canCompleteTransfer ? "bg-[color:var(--surface-3)] text-app-soft shadow-none cursor-not-allowed" : "bg-violet-600 text-white shadow-violet-600/25"
                    }`}
                  >
                    {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Ghi nhận thanh toán thường"}
                  </button>
                </>
              )}
            </div>
          )}

          {paymentMethod === "Cash" && paymentStep === "entry" ? (
            <button
              type="button"
              onClick={confirmCashAmount}
              disabled={!canConfirmCash}
              className={`w-full rounded-[2rem] py-5 text-sm font-black uppercase tracking-widest transition-all active:scale-[0.97] shadow-2xl ${!canConfirmCash ? "bg-[color:var(--surface-3)] text-app-soft shadow-none cursor-not-allowed" : "bg-blue-600 text-white shadow-blue-600/25"}`}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Xác nhận tiền khách đưa
              </span>
            </button>
          ) : paymentMethod === "Cash" ? (
            <>
              <div className="rounded-3xl border-2 border-amber-200 bg-amber-50/80 p-4">
                <div className="mb-3 flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p className="text-xs font-bold leading-5 text-amber-900">
                    Số tiền đã khóa. Quay lại nhập tiền trước khi thối cho khách nếu cần sửa.
                  </p>
                </div>
                <div className="flex justify-between text-sm font-bold text-amber-950/70">
                  <span>Khách đưa (đã xác nhận)</span>
                  <span className="text-lg font-black text-amber-950">{fmt(paid)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-2xl bg-emerald-500 px-4 py-3 text-white">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Tiền thối lại</span>
                  <span className="text-xl font-black">{fmt(change)}</span>
                </div>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-3xl border-2 border-app bg-[color:var(--surface-3)] p-4">
                <input
                  type="checkbox"
                  checked={invoiceVerified}
                  onChange={e => setInvoiceVerified(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-app accent-blue-600"
                />
                <span className="text-xs font-bold leading-5 text-app-strong">
                  Khách đã kiểm tra kỹ hóa đơn trước khi rời quầy.
                </span>
              </label>
              <button
                type="button"
                onClick={resetPaymentFlow}
                disabled={loading}
                className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-app py-3 text-[10px] font-black uppercase tracking-widest text-app-muted"
              >
                <RotateCcw className="h-4 w-4" />
                Quay lại nhập tiền
              </button>
              <button
                type="button"
                onClick={handleCheckout}
                disabled={cart.length === 0 || loading || !invoiceVerified}
                className={`w-full rounded-[2rem] py-5 text-sm font-black uppercase tracking-widest transition-all active:scale-[0.97] shadow-2xl ${cart.length === 0 || !invoiceVerified ? "bg-[color:var(--surface-3)] text-app-soft shadow-none cursor-not-allowed" : "bg-slate-900 text-white shadow-black/20"}`}
              >
                {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Hoàn tất giao dịch"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {receipt && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/60 p-0 backdrop-blur-sm md:items-center md:justify-center md:p-6">
          <div className="app-panel-strong max-h-[92dvh] w-full overflow-hidden rounded-t-[2rem] md:max-w-md md:rounded-[2rem]">
            <div className="flex items-center justify-between border-b border-app p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Thanh toán thành công</p>
                <h2 className="text-xl font-black text-app-strong">{receipt.code}</h2>
                <p className="mt-1 text-[10px] font-bold text-app-muted">Nhắc khách kiểm tra hóa đơn trước khi rời quầy.</p>
              </div>
              <button onClick={() => setReceipt(null)} className="app-button-ghost touch-target" aria-label="Đóng hóa đơn">
                <X className="mx-auto h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[62dvh] overflow-y-auto p-5">
              <div className="app-panel-subtle mb-4 p-4 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-app-muted">Chi nhánh</span>
                  <strong className="text-right text-app-strong">{receipt.branchName}</strong>
                </div>
                <div className="mt-2 flex justify-between gap-3">
                  <span className="text-app-muted">Thời gian</span>
                  <strong className="text-right text-app-strong">{formatDateTime(receipt.createdAt)}</strong>
                </div>
                <div className="mt-2 flex justify-between gap-3">
                  <span className="text-app-muted">Thu ngân</span>
                  <strong className="text-right text-app-strong">{receipt.cashierName}</strong>
                </div>
              </div>

              <div className="space-y-3">
                {receipt.items.map((item) => (
                  <div key={`${item.productCode}-${item.productName}`} className="app-list-item border border-app p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-app-strong">{item.productName}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-app-soft">{item.productCode}</p>
                      </div>
                      <p className="shrink-0 text-sm font-black text-blue-600">{fmt(item.subtotal)}</p>
                    </div>
                    <div className="mt-3 flex justify-between text-xs font-bold text-app-muted">
                      <span>{item.qty} x {fmt(item.unitPrice)}</span>
                      <span>{fmt(item.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-3xl bg-slate-900 p-5 text-white">
                <div className="flex justify-between text-sm text-white/70"><span>Tạm tính</span><span>{fmt(receipt.totalAmount)}</span></div>
                <div className="mt-2 flex justify-between text-sm text-white/70"><span>Giảm giá</span><span>{fmt(receipt.discount)}</span></div>
                <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-lg font-black"><span>Thanh toán</span><span>{fmt(receiptDue)}</span></div>
                <div className="mt-2 flex justify-between text-sm text-white/70">
                  <span>{receipt.paymentMethod === "Transfer" ? "Thanh toán" : "Khách đưa"}</span>
                  <span>{receipt.paymentMethod === "Transfer" ? "Chuyển khoản" : fmt(receiptPaid)}</span>
                </div>
                {receipt.paymentReference && (
                  <div className="mt-2 flex justify-between text-sm text-violet-200">
                    <span>Mã CK</span>
                    <span className="font-mono text-xs">{receipt.paymentReference}</span>
                  </div>
                )}
                {receipt.paymentMethod === "Cash" && (
                  <div className="mt-2 flex justify-between text-sm text-emerald-300">
                    <span>Trả lại</span>
                    <span>{fmt(receiptChange)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-app p-5">
              <button onClick={() => setReceipt(null)} className="app-button-secondary text-xs font-black uppercase tracking-widest">
                Đóng
              </button>
              <button onClick={printReceipt} className="app-button-primary flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest">
                <Printer className="h-4 w-4" />
                In bill
              </button>
            </div>
          </div>
        </div>
      )}

      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/80 p-0 backdrop-blur-sm md:items-center md:justify-center md:p-6">
          <div className="app-panel-strong w-full overflow-hidden rounded-t-[2rem] md:max-w-lg md:rounded-[2rem]">
            <div className="flex items-center justify-between border-b border-app p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Barcode scanner</p>
                <h2 className="text-xl font-black text-app-strong">Quét mã sản phẩm</h2>
              </div>
              <button onClick={() => setIsScannerOpen(false)} className="app-button-ghost touch-target" aria-label="Đóng camera">
                <X className="mx-auto h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="relative overflow-hidden rounded-[2rem] bg-slate-950">
                <video id="barcode-scanner-video" className="aspect-[3/4] w-full object-cover" muted playsInline autoPlay />
                <div className="pointer-events-none absolute inset-0 border-[20px] border-slate-950/35" />
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-3xl border-2 border-emerald-400/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.15)]" />
              </div>

              <div className="app-panel-subtle mt-4 rounded-3xl p-4 text-sm font-bold text-app-muted">
                <div className="flex items-center gap-2 text-app-strong">
                  <Camera className="h-4 w-4 text-blue-600" />
                  Camera scan
                </div>
                <p className="mt-2 text-xs leading-5 text-app-muted">{scannerMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {vietQrModalOpen && currentPendingOrder && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/70 p-0 backdrop-blur-sm md:items-center md:justify-center md:p-6 animate-in fade-in duration-200">
          <div className="app-panel-strong max-h-[95dvh] w-full overflow-hidden rounded-t-[2rem] md:max-w-md md:rounded-[2.5rem] shadow-2xl border-t border-violet-100/10">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-app bg-app-surface p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 animate-pulse">
                  <ScanLine className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-violet-600">Thanh toán VietQR động</p>
                  <h2 className="text-lg font-black text-app-strong">{currentPendingOrder.code}</h2>
                </div>
              </div>
              <button
                onClick={() => {
                  setVietQrModalOpen(false);
                  setCurrentPendingOrder(null);
                }}
                className="app-button-ghost touch-target"
                aria-label="Đóng quét QR"
              >
                <X className="mx-auto h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-6 space-y-6">
              {/* QR Image */}
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="relative p-4 bg-white rounded-3xl border-4 border-violet-100 shadow-inner group">
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-4 border-l-4 border-violet-600 rounded-tl-lg"></div>
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-4 border-r-4 border-violet-600 rounded-tr-lg"></div>
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-4 border-l-4 border-violet-600 rounded-bl-lg"></div>
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-4 border-r-4 border-violet-600 rounded-br-lg"></div>

                  <img
                    src={currentPendingOrder.qrUrl}
                    alt="VietQR Code"
                    className="w-56 h-56 object-contain"
                  />

                  <div className="absolute inset-4 border-2 border-violet-500/20 rounded-2xl pointer-events-none animate-ping"></div>
                </div>
                
                <div className="flex items-center gap-2 bg-violet-50 px-4 py-1.5 rounded-full text-[11px] font-bold text-violet-700">
                  <span className="w-2 h-2 rounded-full bg-violet-600 animate-ping"></span>
                  Đang quét giao dịch ngân hàng...
                </div>
              </div>

              {/* Bank Details */}
              <div className="app-panel-subtle p-5 rounded-[2rem] space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-app-muted font-semibold">Ngân hàng</span>
                  <span className="font-black text-app-strong text-right">MB BANK (Quân Đội)</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-app-muted font-semibold">Số tài khoản</span>
                  <span className="font-black font-mono text-app-strong text-right">190367899999</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-app-muted font-semibold">Tên tài khoản</span>
                  <span className="font-black text-app-strong text-right">HKD ENTERPRISE</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-app pt-3.5">
                  <span className="text-app-muted font-semibold">Số tiền CK</span>
                  <span className="text-base font-black text-blue-600 tracking-tight text-right">{fmt(currentPendingOrder.amount)}</span>
                </div>
                <div className="flex justify-between items-start text-xs border-t border-app pt-3.5">
                  <span className="text-app-muted font-semibold">Nội dung CK</span>
                  <span className="font-black font-mono text-violet-700 text-right bg-violet-50 px-2.5 py-1 rounded-xl">{currentPendingOrder.code}</span>
                </div>
              </div>

              {/* Simulator Action */}
              <div className="space-y-3 pt-2">
                <div className="text-[10px] font-bold leading-relaxed text-app-muted text-center max-w-[280px] mx-auto">
                  Khách hàng quét VietQR trên để chuyển khoản 24/7. POS sẽ hoàn tất đơn hàng tự động sau khi tiền vào tài khoản.
                </div>

                <div className="border-t border-app my-4"></div>

                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await api.post("/payments/simulate-ipn", {
                        orderCode: currentPendingOrder.code,
                        amount: currentPendingOrder.amount
                      });
                      toast.success("Giả lập thanh toán thành công!");
                    } catch (e: unknown) {
                      const err = e as { response?: { data?: string } };
                      toast.error(err.response?.data || "Lỗi giả lập thanh toán");
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white py-3.5 text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/25"
                >
                  <Camera className="w-4 h-4" />
                  {loading ? "Đang xử lý..." : "Giả lập quét QR (Test offline)"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
