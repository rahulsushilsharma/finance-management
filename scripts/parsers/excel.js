import { readFileSync } from 'fs'
import * as XLSX from 'xlsx'
import { detectColumns, normaliseRow } from './detect-columns.js'

function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const text = rows[i].join(' ').toLowerCase()
    if (
      (/(date|txn|posted|value)/.test(text)) &&
      (/(amount|debit|credit|withdrawal|deposit|dr|cr|narration|description|particulars)/.test(text))
    ) return i
  }
  return 0
}

export function parseExcelFile(filePath) {
  const buf = readFileSync(filePath)
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true })

  // Use first sheet, or the one most likely to be a statement
  const sheetName = wb.SheetNames.find((n) =>
    /(statement|transaction|account|detail|history)/i.test(n)
  ) ?? wb.SheetNames[0]

  const ws = wb.Sheets[sheetName]
  // raw: true keeps original values; defval: '' fills blanks
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
  const rows = raw.map((r) => r.map((c) => String(c ?? '').trim()))

  const headerIdx = findHeaderRow(rows)
  const headers = rows[headerIdx]
  const colMap = detectColumns(headers)

  const transactions = []
  for (const cells of rows.slice(headerIdx + 1)) {
    const row = Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']))
    const tx = normaliseRow(row, colMap)
    if (tx) transactions.push(tx)
  }

  return { transactions, colMap, source: 'excel', sheet: sheetName }
}
