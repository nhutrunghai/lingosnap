export interface StreakTask {
  id: string;
  studyDate: string;
  timeSlot: string;
  subject: string;
  durationHours: number;
  status: 'Chưa bắt đầu' | 'Đang học' | 'Đã hoàn thành';
  notes: string;
}
