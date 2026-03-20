import Papa from 'papaparse'

export const parseCsvDataset = <T extends Record<string, string>>(csvText: string): T[] => {
  const parsed = Papa.parse<T>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (value: string) => value.trim(),
    delimiter: ';',
  })

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse error: ${parsed.errors[0]?.message ?? 'unknown error'}`)
  }

  return parsed.data.map((row: T) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value ?? '').trim()])) as T)
}
