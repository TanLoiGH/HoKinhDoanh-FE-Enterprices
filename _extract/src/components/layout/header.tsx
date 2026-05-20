import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b bg-white px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">
          HKD Enterprise
        </Link>
        <nav className="flex gap-4 text-sm font-medium text-gray-600">
          <Link href="/pos" className="hover:text-blue-600">POS</Link>
          <Link href="/products" className="hover:text-blue-600">Hàng hóa</Link>
          <Link href="/inventory" className="hover:text-blue-600">Kho</Link>
          <Link href="/reports" className="hover:text-blue-600">Báo cáo</Link>
        </nav>
      </div>
    </header>
  );
}
