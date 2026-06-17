-- Reset Tickbox về cấp 7 ngày và bắt đầu từ ngày mai cho user đang đăng nhập
-- Chạy trong Supabase SQL Editor khi muốn sửa trạng thái hiện tại.
delete from public.daily_checkins where owner_id = auth.uid();

insert into public.daily_checkin_settings (
  owner_id,
  target_days,
  unlock_hour,
  timezone,
  current_level_index,
  unlocked_level_index,
  start_date,
  updated_at
)
values (
  auth.uid(),
  7,
  22,
  'Asia/Ho_Chi_Minh',
  0,
  0,
  ((now() at time zone 'Asia/Ho_Chi_Minh')::date + interval '1 day')::date,
  now()
)
on conflict (owner_id) do update
set target_days = 7,
    unlock_hour = 22,
    timezone = 'Asia/Ho_Chi_Minh',
    current_level_index = 0,
    unlocked_level_index = 0,
    start_date = ((now() at time zone 'Asia/Ho_Chi_Minh')::date + interval '1 day')::date,
    updated_at = now();
