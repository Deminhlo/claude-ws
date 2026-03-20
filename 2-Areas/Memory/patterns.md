# Patterns & Best Practices (Layer 2: Pattern Memory)

Các mẫu hình (patterns) lặp lại đã được kiểm chứng tính hiệu quả trong dự án này.

## 1. Code Architecture
- **Next.js API Routes**: Luôn dùng `NextRequest` và `NextResponse` trong App Router (`src/app/api/...`).
- **Model Resolution**: Luôn sử dụng `resolveModel` trước khi gọi Claude CLI qua `cliQuery` để tránh lỗi model không tồn tại.

## 2. Agentic Workflow
- **PARA structure**: Ưu tiên tổ chức file theo PARA để AI dễ điều hướng.
- **Verification Gate**: Chạy test/build trước khi tuyên bố hoàn thành task.

## 3. Git Management
- **GitNexus Integration**: Luôn chạy `gitnexus_impact` trước khi sửa symbol để tránh hiệu ứng domino.
