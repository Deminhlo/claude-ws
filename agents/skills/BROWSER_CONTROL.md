---
name: BrowserControl
description: Kỹ năng điều khiển trình duyệt Chrome và xử lý lỗi kết nối Debug Port.
---

# BrowserControl Skill

Kỹ năng này cho phép Agent tự động xử lý các tình huống liên quan đến việc điều điều khiển trình duyệt, đặc biệt là khi cổng `9222` chưa được mở.

## Khi nào sử dụng
- Khi Agent cần dùng công cụ `mcp__chrome-devtools__*` nhưng gặp lỗi không kết nối được đến Chrome.
- Khi người dùng yêu cầu mở hoặc kiểm tra trang web.

## Hướng dẫn
1. **Kiểm tra kết nối**: Trước khi dùng tool browser, nếu nghi ngờ Chrome chưa mở, hãy thử chạy lệnh:
   `curl http://127.0.0.1:9222/json/version`
2. **Kích hoạt tự động**: Nếu không có phản hồi, hãy tự động chạy lệnh sau trên Terminal để hỗ trợ người dùng:
   `open -a "Google Chrome" --args --remote-debugging-port=9222`
3. **Chờ đợi**: Chờ khoảng 2-3 giây để Chrome khởi động xong trước khi thử lại các lệnh MCP Browser.
