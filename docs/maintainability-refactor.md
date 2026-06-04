# Codebase Maintainability Refactor

Mục tiêu của đợt refactor này là để người đọc lại sau 3, 6 hoặc 12 tháng vẫn hiểu nhanh:

- Màn hình này phục vụ nghiệp vụ gì.
- Dữ liệu chính đi qua những type/API/helper nào.
- Logic nào là nghiệp vụ, logic nào chỉ là UI.

## Quy ước frontend

Các route trong `src/app` chỉ nên giữ phần điều phối màn hình: state, effect, event handler và JSX chính.

Logic nghiệp vụ riêng của từng module đặt trong `src/features/<module>`:

- `types.ts`: kiểu dữ liệu dùng trong module.
- `*-api.ts`: các lời gọi API có tên theo nghiệp vụ.
- `form.ts`: tạo form rỗng, map dữ liệu API sang form, validate nhẹ.
- `pricing.ts`, `barcode.ts`, `audio.ts`: helper thuần, không phụ thuộc React.

Ví dụ POS hiện có:

- `src/features/pos/types.ts`: type của POS, giỏ hàng, receipt, barcode.
- `src/features/pos/pricing.ts`: tính tổng tiền, giảm giá, format VND.
- `src/features/pos/barcode.ts`: chuẩn hóa và dò sản phẩm theo mã quét.
- `src/features/pos/audio.ts`: âm thanh báo thanh toán thành công.

## Quy ước backend

Backend đang đi theo hướng phân lớp:

- `HKD.API`: controller, auth policy, cấu hình HTTP.
- `HKD.Application`: command/query/service nghiệp vụ.
- `HKD.Domain`: entity, enum, khái niệm lõi.
- `HKD.Infrastructure`: database, migration, service hạ tầng.

Controller không nên chứa logic nghiệp vụ dài. Khi một controller bắt đầu khó đọc, tách phần tính toán/ghi dữ liệu sang Application service hoặc query/command.

Seed dữ liệu nền nên đặt trong `HKD.Infrastructure/Data/Seed`, không để lẫn cuối `AppDbContext`.

## Tiêu chí refactor an toàn

- Không đổi hành vi người dùng nếu task chỉ là refactor.
- Tách type/helper trước, tách UI component sau.
- Sau mỗi cụm refactor phải chạy build/lint/test liên quan.
- Không đổi dữ liệu migration khi chỉ đang dọn code.
- Đặt tên theo nghiệp vụ thay vì tên kỹ thuật chung chung.

## Các điểm nên tiếp tục dọn

- `src/app/pos/page.tsx`: tiếp tục tách UI thành `ProductPanel`, `CartPanel`, `ReceiptModal`, `VietQrModal`.
- `src/app/reports/page.tsx`: tách bộ lọc, bảng báo cáo, export/print helper.
- `src/app/products/page.tsx`: tách form sản phẩm và bảng sản phẩm.
- `HKD.API/Controllers/ReportsController.cs`: chuyển query/tổng hợp báo cáo sang Application.
- `HKD.API/Program.cs`: gom đăng ký service/policy thành extension methods.
