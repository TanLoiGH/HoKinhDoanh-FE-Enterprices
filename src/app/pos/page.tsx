"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "@/lib/axios";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import toast from "react-hot-toast";
import { playSuccessChime } from "@/features/pos/audio";
import { BarcodeScannerModal } from "@/features/pos/BarcodeScannerModal";
import { CartPanel } from "@/features/pos/CartPanel";
import { findProductByScannedCode, normalizeBarcode } from "@/features/pos/barcode";
import { createClientRequestId } from "@/features/pos/client-request";
import {
  formatDateTime,
  formatVnd,
  getCartItemCount,
  getCartTotal,
  getDiscountAmount,
  getSuggestedDenominations,
} from "@/features/pos/pricing";
import type {
  CartItem,
  Customer,
  DiscountMode,
  OrderReceipt,
  PaymentStep,
  PendingVietQrOrder,
  PosPaymentMethod,
  PosTab,
  Product,
  ReceiptDeliveryStatus,
  TransferSubMethod,
} from "@/features/pos/types";
import { PosMobileTabs } from "@/features/pos/PosMobileTabs";
import { ProductPanel } from "@/features/pos/ProductPanel";
import { ReceiptSuccessModal } from "@/features/pos/ReceiptSuccessModal";
import { VietQrPaymentModal } from "@/features/pos/VietQrPaymentModal";
import { scanProduct } from "@/features/barcode/product-scan-api";
import { useUsbBarcodeScanner } from "@/features/barcode/useUsbBarcodeScanner";

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [discountMode, setDiscountMode] = useState<DiscountMode>("amount");
  const [discountValue, setDiscountValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [receiptDeliveryStatus, setReceiptDeliveryStatus] = useState<ReceiptDeliveryStatus | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [usbScanEnabled, setUsbScanEnabled] = useState(true);
  const [scannerMessage, setScannerMessage] = useState("Đưa mã vạch vào giữa khung quét.");

  const [activeTab, setActiveTab] = useState<PosTab>("products");
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>("Cash");
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("entry");
  const [lockedPaidAmount, setLockedPaidAmount] = useState<number | null>(null);
  const [invoiceVerified, setInvoiceVerified] = useState(false);
  const [transferNote, setTransferNote] = useState("");
  const [transferSubMethod, setTransferSubMethod] = useState<TransferSubMethod>("VietQR");
  const [vietQrModalOpen, setVietQrModalOpen] = useState(false);
  const [currentPendingOrder, setCurrentPendingOrder] = useState<PendingVietQrOrder | null>(null);
  const checkoutInFlightRef = useRef(false);

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

  const fetchReceiptDeliveryStatus = async () => {
    try {
      const response = await api.get<ReceiptDeliveryStatus>("/receipt-delivery/status");
      setReceiptDeliveryStatus(response.data);
    } catch {
      setReceiptDeliveryStatus(null);
    }
  };

  useEffect(() => {
    void fetchProducts();
    void fetchCustomers();
    void fetchReceiptDeliveryStatus();
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

  const addToCart = useCallback((product: Product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  }, []);

  const addScannedCodeToCart = useCallback(async (rawValue: string) => {
    const normalized = normalizeBarcode(rawValue);
    if (!normalized) return;

    const localMatch = findProductByScannedCode(products, rawValue);

    if (localMatch) {
      addToCart(localMatch);
      setScannerMessage(`Đã thêm ${localMatch.name}`);
      toast.success(`Đã thêm ${localMatch.name}`);
      return;
    }

    try {
      const scanResult = await scanProduct(rawValue);
      const product = products.find((item) => item.id === scanResult.productId) ?? {
        id: scanResult.productId,
        code: scanResult.productCode,
        name: scanResult.productName,
        categoryId: 0,
        categoryName: "Khác",
        sellPrice: scanResult.sellPrice,
        stock: scanResult.stock,
        barcodes: [{ barcode: scanResult.barcode, type: scanResult.matchedBy, isPrimary: true }],
      };
      addToCart(product);
      setScannerMessage(`Đã thêm ${scanResult.productName}`);
      toast.success(`Đã thêm ${scanResult.productName}`);
    } catch {
      setScannerMessage(`Không tìm thấy mã: ${rawValue}`);
      toast.error(`Không tìm thấy mã: ${rawValue}`);
    }
  }, [addToCart, products]);

  useUsbBarcodeScanner({
    enabled: usbScanEnabled,
    onScan: addScannedCodeToCart,
  });

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
      const normalized = normalizeBarcode(rawValue);
      const now = Date.now();
      if (!normalized || (normalized === lastDetected && now - lastDetectedAt < 2000)) {
        return;
      }

      lastDetected = normalized;
      lastDetectedAt = now;

      void addScannedCodeToCart(rawValue);
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
  }, [addScannedCodeToCart, isScannerOpen]);

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev
      .map(item => item.id === id ? { ...item, qty: item.qty + delta } : item)
      .filter(item => item.qty > 0)
    );
  };

  const totalAmount = getCartTotal(cart);
  const discountAmount = getDiscountAmount(totalAmount, discountMode, discountValue);
  const payableAmount = Math.max(0, totalAmount - discountAmount);

  // Auto-fill paidAmount when total changes
  useEffect(() => {
    void Promise.resolve().then(() => {
      if (payableAmount > 0 && (!paidAmount || Number(paidAmount) === 0)) {
        setPaidAmount(payableAmount.toString());
      } else if (payableAmount === 0 && paidAmount) {
        setPaidAmount("");
      }
    });
  }, [payableAmount, paidAmount]);

  const paid = paymentStep === "confirm" && lockedPaidAmount != null
    ? lockedPaidAmount
    : Number(paidAmount || 0);
  const change = Math.max(0, paid - payableAmount);
  const canConfirmCash = cart.length > 0 && paid >= payableAmount && payableAmount > 0;
  const suggestedBills = useMemo(
    () => (payableAmount > 0 ? getSuggestedDenominations(payableAmount) : []),
    [payableAmount],
  );
  const totalItems = getCartItemCount(cart);

  const resetPaymentFlow = () => {
    setPaymentStep("entry");
    setLockedPaidAmount(null);
    setInvoiceVerified(false);
  };

  const switchPaymentMethod = (method: PosPaymentMethod) => {
    setPaymentMethod(method);
    resetPaymentFlow();
  };

  const canCompleteTransfer = cart.length > 0 && payableAmount > 0;

  const confirmCashAmount = () => {
    if (cart.length === 0 || paid < payableAmount) return;
    setLockedPaidAmount(paid);
    setPaymentStep("confirm");
    setInvoiceVerified(false);
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
          setDiscountValue("");
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
    if (cart.length === 0 || payableAmount <= 0) return;
    if (checkoutInFlightRef.current) return;

    checkoutInFlightRef.current = true;
    setLoading(true);
    try {
      // 1. Tạo đơn hàng dưới dạng Pending bằng cách chọn provider VNPay
      const createResponse = await api.post<number>("/orders", {
        clientRequestId: createClientRequestId(),
        discount: discountAmount,
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
        amount: payableAmount,
        qrUrl: qrResponse.data.qrUrl
      });
      setVietQrModalOpen(true);
    } catch (error: unknown) {
      console.error("Lỗi tạo đơn hàng VietQR:", error);
      toast.error(getApiErrorMessage(error, "Lỗi tạo đơn hàng VietQR"));
    } finally {
      checkoutInFlightRef.current = false;
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || payableAmount <= 0) return;
    if (checkoutInFlightRef.current) return;

    if (paymentMethod !== "Transfer") {
      const finalPaid = lockedPaidAmount ?? paid;
      if (finalPaid < payableAmount || paymentStep !== "confirm" || !invoiceVerified) return;
    }

    checkoutInFlightRef.current = true;
    setLoading(true);
    try {
      const isTransfer = paymentMethod === "Transfer";
      const createResponse = await api.post<number>("/orders", {
        clientRequestId: createClientRequestId(),
        discount: discountAmount,
        paidAmount: isTransfer ? payableAmount : (lockedPaidAmount ?? paid),
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
      setDiscountValue("");
      setTransferNote("");
      resetPaymentFlow();
      toast.success("Thanh toán thành công!");
      fetchProducts();
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setActiveTab("products");
      }
    } catch (error: unknown) {
      const e = error as { isQueuedOffline?: boolean };
      toast.error(e.isQueuedOffline ? "Mất mạng: đơn hàng đã được xếp hàng chờ đồng bộ, chưa thể in bill cho tới khi có mạng." : getApiErrorMessage(error, "Lỗi thanh toán"));
    } finally {
      checkoutInFlightRef.current = false;
      setLoading(false);
    }
  };

  const fmt = formatVnd;
  const receiptPaid = receipt?.paidAmount || 0;
  const receiptDue = receipt ? Math.max(0, receipt.totalAmount - receipt.discount) : 0;
  const receiptChange = Math.max(0, receiptPaid - receiptDue);

  const printReceipt = () => {
    if (!receipt) return;
    window.open(`/receipt/${receipt.id}?autoprint=1`, "_blank", "noopener,noreferrer");
  };

  const copyReceiptLink = async () => {
    if (!receipt || typeof window === "undefined") return;
    const link = `${window.location.origin}/receipt/${receipt.id}`;
    await navigator.clipboard.writeText(link);
    toast.success("Đã sao chép link hóa đơn");
  };

  const simulateVietQrPayment = async () => {
    if (!currentPendingOrder) return;

    setLoading(true);
    try {
      await api.post("/payments/simulate-ipn", {
        orderCode: currentPendingOrder.code,
        amount: currentPendingOrder.amount,
      });
      toast.success("Giả lập thanh toán thành công!");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Lỗi giả lập thanh toán"));
      setLoading(false);
    }
  };

  return (
    <div className="relative -m-3 flex min-h-[calc(100dvh-8rem)] flex-col gap-4 md:m-0 lg:min-h-0 lg:flex-row">
      <PosMobileTabs
        activeTab={activeTab}
        totalItems={totalItems}
        onTabChange={setActiveTab}
      />

      <ProductPanel
        activeTab={activeTab}
        products={products}
        filteredProducts={filteredProducts}
        cart={cart}
        categories={categories}
        activeCategory={activeCategory}
        searchTerm={searchTerm}
        fetching={fetching}
        usbScanEnabled={usbScanEnabled}
        totalItems={totalItems}
        payableAmount={payableAmount}
        formatCurrency={fmt}
        onSearchChange={setSearchTerm}
        onCategoryChange={setActiveCategory}
        onUsbScanEnabledChange={setUsbScanEnabled}
        onOpenScanner={() => {
          setScannerMessage("Đưa mã vạch vào giữa khung quét.");
          setIsScannerOpen(true);
        }}
        onAddToCart={addToCart}
        onTabChange={setActiveTab}
      />

      <CartPanel
        activeTab={activeTab}
        cart={cart}
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        totalItems={totalItems}
        totalAmount={totalAmount}
        discountMode={discountMode}
        discountValue={discountValue}
        discountAmount={discountAmount}
        payableAmount={payableAmount}
        paymentMethod={paymentMethod}
        paymentStep={paymentStep}
        paidAmount={paidAmount}
        paid={paid}
        change={change}
        suggestedBills={suggestedBills}
        loading={loading}
        canConfirmCash={canConfirmCash}
        canCompleteTransfer={canCompleteTransfer}
        transferSubMethod={transferSubMethod}
        transferNote={transferNote}
        invoiceVerified={invoiceVerified}
        formatCurrency={fmt}
        onCustomerChange={setSelectedCustomerId}
        onUpdateQty={updateQty}
        onDiscountModeChange={setDiscountMode}
        onDiscountValueChange={(value) => {
          setDiscountValue(value);
          resetPaymentFlow();
        }}
        onPaymentMethodChange={switchPaymentMethod}
        onPaidAmountChange={setPaidAmount}
        onTransferSubMethodChange={setTransferSubMethod}
        onTransferNoteChange={setTransferNote}
        onConfirmCashAmount={confirmCashAmount}
        onResetPaymentFlow={resetPaymentFlow}
        onInvoiceVerifiedChange={setInvoiceVerified}
        onVietQrCheckout={handleVietQrCheckout}
        onCheckout={handleCheckout}
      />

      {receipt && (
        <ReceiptSuccessModal
          receipt={receipt}
          receiptDeliveryStatus={receiptDeliveryStatus}
          receiptDue={receiptDue}
          receiptPaid={receiptPaid}
          receiptChange={receiptChange}
          formatCurrency={fmt}
          formatDateTime={formatDateTime}
          onClose={() => setReceipt(null)}
          onCopyLink={() => void copyReceiptLink()}
          onPrint={printReceipt}
        />
      )}

      {isScannerOpen && (
        <BarcodeScannerModal
          scannerMessage={scannerMessage}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {vietQrModalOpen && currentPendingOrder && (
        <VietQrPaymentModal
          order={currentPendingOrder}
          loading={loading}
          formatCurrency={fmt}
          onClose={() => {
            setVietQrModalOpen(false);
            setCurrentPendingOrder(null);
          }}
          onSimulatePayment={() => void simulateVietQrPayment()}
        />
      )}
    </div>
  );
}
