# Browser Control Skill (Layer 3: Skills)

Kỹ năng điều khiển và tương tác với trình duyệt Chrome thông qua Chrome DevTools Protocol.

## 1. Mục tiêu
Cho phép Agent mở trang web, nhấn (click), nhập liệu (type), chụp màn hình và trích xuất dữ liệu từ DOM.

## 2. Trigger
Khi người dùng yêu cầu truy cập một URL, tìm kiếm thông tin trên web, hoặc thực hiện các thao tác trên ứng dụng web mà không có API trực tiếp.

## 3. Input
- `url`: Địa chỉ trang web cần truy cập.
- `selectors`: CSS selectors cho các phần tử cần tương tác.
- `actions`: Danh sách các hành động cần thực hiện.

## 4. Quy trình xử lý
1. `open_browser_url`: Mở trình duyệt đến URL chỉ định.
2. `take_snapshot`: Đọc cấu trúc cây A11y để xác định phần tử.
3. `click/type/hover`: Thực hiện tương tác.
4. `wait_for`: Đợi phản hồi từ trang web.

## 5. Output
- Dữ liệu đã trích xuất (Markdown).
- Trạng thái thành công/thất bại của hành động.
- Ảnh chụp màn hình (nếu có yêu cầu).

---
*Lưu ý: Luôn kiểm tra tính hợp lệ của URL trước khi mở.*
