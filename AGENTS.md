# Project Agent Rules

Scope: entire repository.

## Default workflow
- Khi người dùng yêu cầu chỉnh sửa code, hãy tự kiểm tra các file liên quan, sửa trực tiếp, chạy kiểm tra phù hợp, commit và push lên GitHub sau khi hoàn tất nếu thay đổi đã build/pass.
- Không cần hỏi lại việc push nếu yêu cầu của người dùng là thay đổi code trong dự án này; mặc định push lên `origin main`.
- Trước khi push, chạy `npm run build` nếu thay đổi liên quan TypeScript/React/UI/service.
- Nếu push bị từ chối vì remote mới hơn, chạy `git pull --rebase origin main`, xử lý conflict nếu có, rồi push lại.
- Không commit/push nếu build fail; báo lỗi và file cần sửa.

## App notes
- Đây là app React + Vite + Supabase.
- Menu chính nằm trong `components/Header.tsx`.
- Mode/routing chính nằm trong `types.ts` và `App.tsx`.
- Supabase helper nằm trong `services/supabaseService.ts`.
- SQL chạy trong Supabase SQL Editor đặt trong thư mục `supabase/`.

## UI/text quality
- Giữ tiếng Việt hiển thị đúng Unicode, tránh mojibake như `Bá»™`, `Ä‘`, `ChÆ°a`.
- Khi thấy lỗi font/encoding ở màn đang sửa, ưu tiên sửa luôn các chuỗi liên quan trong cùng file.

## Git
- Commit message ngắn gọn bằng tiếng Anh.
- Không tạo branch mới trừ khi người dùng yêu cầu.
- Sau khi push, báo commit hash và trạng thái GitHub Pages/Actions nếu có thể kiểm tra.
