const splitCsvLine = (line: string, delimiter: string): string[] => {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        index += 1
        continue
      }
      inQuotes = !inQuotes
      continue
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }

    current += char
  }

  cells.push(current)
  return cells
}

export const parseCsvDataset = <T extends Record<string, string>>(csvText: string, delimiter = ';'): T[] => {
  const normalized = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean)

  if (lines.length === 0) return []

  const headers = splitCsvLine(lines[0], delimiter).map((header) => header.trim())

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, delimiter)
    if (values.length !== headers.length) {
      throw new Error(`CSV parse error: expected ${headers.length} columns, got ${values.length}`)
    }

    return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ''])) as T
  })
}
