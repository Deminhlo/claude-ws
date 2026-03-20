# Lessons Learned & Evolution (Layer 6: Evolution History)

Ghi lại các bài học sau mỗi phiên làm việc để không lặp lại lỗi cũ và tiến hóa năng lực Agent.

## [2026-03-20] Fix Git Commit & Upgrade PARA
- **Lỗi**: Claude CLI treo khi nhận model ID dài (vd: `claude-haiku-4-5-20251001`).
- **Giải pháp**: Phải dùng `resolveModel` để chuyển về alias ngắn (`haiku`).
- **Bài học**: Luôn kiểm tra tính tương thích của Model ID với phiên bản CLI hiện tại. Đừng giả định model ID mới nhất sẽ chạy được ngay mà không qua alias.
- **Tiến hóa**: Đã tích hợp framework 6 lớp vào CLAUDE.md để đảm bảo tính kỷ luật cho các phiên sau.
