import { readFileSync } from 'fs'
import { detectColumns, normaliseRow } from './detect-columns.js'

function detectDelimiter(lines) {
  const sample = lines.slice(0, 10).join('\n')
  const candidates = [',', '\t', ';', '|']
  const best = candidates.reduce((b, d) =>
    (sample.split(d).length > sample.split(b).length ? d : b), ',')
  const multiSpaceCount = sample.split(/    +/).length
  const bestCount = sample.split(best).length
  return multiSpaceCount > bestCount * 1.5 ? 'MULTISPAC' : best
}

function splitLine(line, delimiter) {
  if (delimiter === 'MULTISPAC') return line.split(/    +/).map((f) => f.trim())
  const fields = []
  let field = '', inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { field += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === delimiter && !inQuote) { fields.push(field.trim()); field = '' }
    else field += ch
  }
  fields.push(field.trim())
  return fields
}

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

function firstDataRow(rows, headerIdx) {
  for (let i = headerIdx + 1; i < rows.length; i++) {
    if (rows[i].join('').replace(/\*/g, '').trim().length > 0) return i
  }
  return headerIdx + 1
}

export function parseCSVFile(filePath) {
  const text = readFileSync(filePath, 'utf8')
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const delimiter = detectDelimiter(lines)
  const rows = lines.map((l) => splitLine(l, delimiter))

  const headerIdx = findHeaderRow(rows)
  const headers = rows[headerIdx]
  const colMap = detectColumns(headers)

  const dataStart = firstDataRow(rows, headerIdx)
  const transactions = []

  const debitIdx = colMap.debit ? headers.indexOf(colMap.debit) : -1
  const creditIdx = colMap.credit ? headers.indexOf(colMap.credit) : -1
  const balanceIdx = colMap.balance ? headers.indexOf(colMap.balance) : -1

  let prevBalance = NaN

  for (const cells of rows.slice(dataStart)) {
    let row

    // Multi-space + Dr/Cr pair + one cell short = collapsed empty amount column
    if (delimiter === 'MULTISPAC' && debitIdx >= 0 && creditIdx >= 0 &&
        cells.length === headers.length - 1) {
      // The two amount columns share one cell. Use balance delta to assign direction.
      // Re-insert a blank at whichever of debit/credit is missing.
      const amount = parseFloat(cells[debitIdx]?.replace(/,/g, '') ?? '')
      const balance = parseFloat(cells[debitIdx + 1]?.replace(/,/g, '') ?? '')
      const isCredit = !isNaN(prevBalance) && !isNaN(balance) && balance > prevBalance

      const expanded = [...cells]
      if (isCredit) {
        expanded.splice(debitIdx, 0, '')   // insert blank before credit value
      } else {
        expanded.splice(creditIdx, 0, '')  // insert blank before balance (after debit value)
      }
      row = Object.fromEntries(headers.map((h, i) => [h, expanded[i] ?? '']))
      if (!isNaN(balance)) prevBalance = balance
    } else {
      row = Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']))
      if (balanceIdx >= 0 && cells[balanceIdx]) {
        const b = parseFloat(cells[balanceIdx].replace(/,/g, ''))
        if (!isNaN(b)) prevBalance = b
      }
    }

    const tx = normaliseRow(row, colMap)
    if (tx) transactions.push(tx)
  }

  return { transactions, colMap, source: 'csv', delimiter }
}
