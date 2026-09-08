export function optionalNumber(value: string, label: string, min: number, max = Infinity): number | null {
  if (!value.trim()) return null
  const normalized = value.trim().replace(',', '.')
  const number = Number(normalized)
  if (!/^-?\d+(\.\d+)?$/.test(normalized) || !Number.isFinite(number) || number < min || number > max) {
    throw new Error(`${label} không hợp lệ. Vui lòng kiểm tra lại.`)
  }
  return number
}
