# LingoSnap

Web học từ vựng cá nhân: upload ảnh bài tập, Gemini trích xuất nội dung, lưu từ vựng lên Supabase, ôn tập bằng quiz/phát âm và ghi nhận Pomodoro streak.

## Cấu hình Supabase

1. Vào Supabase project > SQL Editor.
2. Copy toàn bộ nội dung `supabase/schema.sql` và bấm Run.
3. Vào Project Settings > API, lấy:
   - Project URL -> `VITE_SUPABASE_URL`
   - Publishable key hoặc legacy anon public key -> `VITE_SUPABASE_ANON_KEY`
4. Không dùng secret/service_role key trong web.

## Chạy local

Tạo `.env.local`:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

Sau đó chạy:

```bash
npm install
npm run dev
```

## Deploy GitHub Pages

Vào GitHub repository > Settings > Secrets and variables > Actions > New repository secret, thêm:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`

Sau đó vào Settings > Pages > Source chọn `GitHub Actions`. Mỗi lần push lên `main`, workflow `.github/workflows/deploy.yml` sẽ build và deploy.

## Dữ liệu

- `exercise_items`: lưu bài/từ vựng theo tài khoản Supabase Auth.
- `pomodoro_sessions`: lưu phiên Pomodoro đã hoàn thành để tính streak.
- Laptop và điện thoại sẽ thấy cùng dữ liệu khi đăng nhập cùng email/mật khẩu.
