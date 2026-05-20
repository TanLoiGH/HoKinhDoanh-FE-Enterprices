"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import { jsPDF } from "jspdf";

interface OrderReceipt {
  id: number;
  code: string;
  createdAt: string;
  totalAmount: number;
  discount: number;
  paidAmount: number;
  paymentMethod: string;
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

export default function ReceiptPrintPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const response = await api.get<OrderReceipt>(`/orders/${params.id}`);
        setReceipt(response.data);
      } catch {
        setError("Không tải được hóa đơn.");
      } finally {
        setLoading(false);
      }
    };

    void fetchReceipt();
  }, [params.id]);

  useEffect(() => {
    if (!receipt) return;
    if (searchParams.get("autoprint") !== "1") return;

    const timer = window.setTimeout(() => {
      window.print();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [receipt, searchParams]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

  const formatDateTime = (value: string) => new Date(value).toLocaleString("vi-VN");

  const downloadPdf = () => {
    if (!receipt) return;

    const receiptPaid = receipt.paidAmount || 0;
    const receiptDue = Math.max(0, receipt.totalAmount - receipt.discount);
    const receiptChange = Math.max(0, receiptPaid - receiptDue);
    const pageWidth = 80;
    const lineHeight = 5;
    const baseHeight = 70 + (receipt.items.length * 12);
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [pageWidth, baseHeight],
    });

    let y = 8;
    const left = 6;
    const right = pageWidth - 6;

    const writeLine = (label: string, value?: string, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(label, left, y);
      if (value) {
        doc.text(value, right, y, { align: "right" });
      }
      y += lineHeight;
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("HKD Enterprise", pageWidth / 2, y, { align: "center" });
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(receipt.branchName, pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.text(receipt.code, pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.text(formatDateTime(receipt.createdAt), pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.text(`Thu ngan: ${receipt.cashierName}`, pageWidth / 2, y, { align: "center" });
    y += 4;

    doc.line(left, y, right, y);
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.text("Mon", left, y);
    doc.text("SL", 42, y, { align: "right" });
    doc.text("Gia", 58, y, { align: "right" });
    doc.text("Tien", right, y, { align: "right" });
    y += 4;

    doc.setFont("helvetica", "normal");
    receipt.items.forEach((item) => {
      y += 4;
      doc.text(item.productName, left, y, { maxWidth: 34 });
      doc.text(String(item.qty), 42, y, { align: "right" });
      doc.text(fmt(item.unitPrice), 58, y, { align: "right", maxWidth: 14 });
      doc.text(fmt(item.subtotal), right, y, { align: "right", maxWidth: 18 });
      y += 4;
      doc.setFontSize(8);
      doc.text(item.productCode, left, y);
      doc.setFontSize(9);
      y += 4;
    });

    doc.line(left, y, right, y);
    y += 6;

    writeLine("Tam tinh", fmt(receipt.totalAmount));
    writeLine("Giam gia", fmt(receipt.discount));
    writeLine("Thanh toan", fmt(receiptDue), true);
    writeLine("Khach dua", fmt(receiptPaid));
    writeLine("Tra lai", fmt(receiptChange));

    y += 3;
    doc.setFont("helvetica", "normal");
    doc.text("Cam on quy khach!", pageWidth / 2, y, { align: "center" });

    doc.save(`${receipt.code}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-page text-sm font-bold text-app-muted">
        Đang tải hóa đơn...
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-page text-sm font-bold text-rose-600">
        {error || "Không tìm thấy hóa đơn."}
      </div>
    );
  }

  const receiptPaid = receipt.paidAmount || 0;
  const receiptDue = Math.max(0, receipt.totalAmount - receipt.discount);
  const receiptChange = Math.max(0, receiptPaid - receiptDue);

  return (
    <div className="min-h-screen bg-app-page p-6 text-app-strong print:bg-white print:p-0 print:text-slate-900">
      <style jsx global>{`
        @media print {
          body {
            background: white;
          }

          .print-hide {
            display: none !important;
          }
        }
      `}</style>

      <div className="print-hide mx-auto mb-4 flex max-w-[320px] items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="app-button-primary rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-widest"
          >
            In lại
          </button>
          <button
            type="button"
            onClick={downloadPdf}
            className="app-button-primary rounded-2xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-blue-700"
          >
            Tải PDF
          </button>
        </div>
        <button
          type="button"
          onClick={() => window.close()}
          className="app-button-secondary rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-widest"
        >
          Đóng
        </button>
      </div>

      <div className="app-panel mx-auto w-[280px] p-5 text-[11px] leading-relaxed print:border-none print:bg-white print:p-0 print:shadow-none">
        <h1 className="text-center text-lg font-black">HKD Enterprise</h1>
        <div className="mb-3 text-center text-[11px] text-app-muted print:text-slate-500">
          {receipt.branchName}
          <br />
          {receipt.code}
          <br />
          {formatDateTime(receipt.createdAt)}
          <br />
          Thu ngân: {receipt.cashierName}
        </div>

        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th className="border-t border-dashed border-slate-300 py-1 text-left">Món</th>
              <th className="border-t border-dashed border-slate-300 py-1 text-right">SL</th>
              <th className="border-t border-dashed border-slate-300 py-1 text-right">Giá</th>
              <th className="border-t border-dashed border-slate-300 py-1 text-right">Tiền</th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((item) => (
              <tr key={`${item.productCode}-${item.productName}`}>
                <td className="border-t border-dashed border-slate-200 py-2">
                  {item.productName}
                  <br />
                  <span className="text-[10px] text-app-soft print:text-slate-400">{item.productCode}</span>
                </td>
                <td className="border-t border-dashed border-slate-200 py-2 text-right">{item.qty}</td>
                <td className="border-t border-dashed border-slate-200 py-2 text-right">{fmt(item.unitPrice)}</td>
                <td className="border-t border-dashed border-slate-200 py-2 text-right">{fmt(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 border-t border-slate-900 pt-2">
          <div className="flex justify-between py-0.5">
            <span>Tạm tính</span>
            <strong>{fmt(receipt.totalAmount)}</strong>
          </div>
          <div className="flex justify-between py-0.5">
            <span>Giảm giá</span>
            <strong>{fmt(receipt.discount)}</strong>
          </div>
          <div className="flex justify-between py-1 text-sm font-black">
            <span>Thanh toán</span>
            <strong>{fmt(receiptDue)}</strong>
          </div>
          <div className="flex justify-between py-0.5">
            <span>Khách đưa</span>
            <strong>{fmt(receiptPaid)}</strong>
          </div>
          <div className="flex justify-between py-0.5">
            <span>Trả lại</span>
            <strong>{fmt(receiptChange)}</strong>
          </div>
        </div>

        <div className="mt-4 text-center text-[11px]">Cảm ơn quý khách!</div>
      </div>
    </div>
  );
}
