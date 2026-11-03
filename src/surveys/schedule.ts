export function vietnamDateTime(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim()) || !/^\d{2}:\d{2}$/.test(time.trim())) throw new Error('Nhập ngày YYYY-MM-DD và giờ HH:mm, ví dụ 2026-11-10 và 08:30.')
  const value = `${date.trim()}T${time.trim()}:00+07:00`
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) throw new Error('Ngày hoặc giờ không hợp lệ.')
  const local = new Date(parsed.getTime() + 7 * 3600_000).toISOString().slice(0, 16)
  if (local !== `${date.trim()}T${time.trim()}`) throw new Error('Ngày hoặc giờ không hợp lệ.')
  return parsed.toISOString()
}
