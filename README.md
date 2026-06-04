# LingoSnap

Web học từ vựng cá nhân: upload ảnh bài tập, OpenAI trích xuất nội dung, lưu từ vựng lên Supabase, ôn tập bằng quiz/phát âm và ghi nhận Pomodoro streak.

## Cấu hình Supabase

1. Vào Supabase project > SQL Editor.
2. Copy toàn bộ nội dung `supabase/schema.sql` và bấm Run.
3. Vào Project Settings > API, lấy:
   - Project URL -> `VITE_SUPABASE_URL`
   - Publishable key hoặc legacy anon public key -> `VITE_SUPABASE_ANON_KEY`
4. Không dùng secret/service_role key trong web.

## Cấu hình OpenAI

App dùng `gpt-4o-mini` mặc định để tiết kiệm chi phí cho tác vụ đọc ảnh bài tập đơn giản.

Lưu ý quan trọng: vì GitHub Pages là web tĩnh, `VITE_OPENAI_API_KEY` sẽ nằm ở phía trình duyệt. Chỉ dùng app cá nhân, đặt usage limit trong OpenAI dashboard, và revoke key ngay nếu đã lộ.

## Chạy local

Tạo `.env.local`:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
VITE_OPENAI_API_KEY=your-openai-api-key
VITE_OPENAI_MODEL=gpt-4o-mini
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
- `VITE_OPENAI_API_KEY`

Tuỳ chọn: vào tab Variables thêm `VITE_OPENAI_MODEL=gpt-4o-mini`. Nếu không thêm, app tự dùng `gpt-4o-mini`.

Sau đó vào Settings > Pages > Source chọn `GitHub Actions`. Mỗi lần push lên `main`, workflow `.github/workflows/deploy.yml` sẽ build và deploy.

## Dữ liệu

- `exercise_items`: lưu bài/từ vựng theo tài khoản Supabase Auth.
- `pomodoro_sessions`: lưu phiên Pomodoro đã hoàn thành để tính streak.
- Laptop và điện thoại sẽ thấy cùng dữ liệu khi đăng nhập cùng email/mật khẩu.
