-- Xóa toàn bộ data Tickbox của tất cả user (chạy nếu muốn reset sạch bảng)
truncate table public.daily_checkins;
truncate table public.daily_checkin_settings;

-- Nếu chỉ muốn xóa data Tickbox của user đang đăng nhập trong SQL Editor:
-- delete from public.daily_checkins where owner_id = auth.uid();
-- delete from public.daily_checkin_settings where owner_id = auth.uid();
