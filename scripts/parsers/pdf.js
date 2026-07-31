import { readFileSync } from 'fs'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')
import { detectColumns, normaliseRow, parseDate, parseAmount } from './detect-columns.js'

/**
 * PDF parsing strategy:
 * 1. Extract raw text from each page
 * 2. Find the header line (same heuristic as CSV)
 * 3. Split remaining lines into token arrays aligned by whitespace position
 *
 * PDFs are the hardest — text positions vary by bank. Two strategies:
 *   a) Table-based: fixed column positions from the header line
 *   b) Regex-based: scan each line for date + amount patterns
 *
 * We try (a) first, fall back to (b).
 */

const DATE_RE = /\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/i
const AMOUNT_RE = /\b(\d{1,3}(?:[,\s]\d{2,3})*(?:\.\d{2})?)\b/g

function tokeniseLine(line) {
  // Split on 2+ spaces (column separator in monospace PDFs)
  return line.split(/\s{2,}/).map((t) => t.trim()).filter(Boolean)
}

function findHeaderLine(lines) {
  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    const lower = lines[i].toLowerCase()
    if (
      (/(date|txn|posted|value)/.test(lower)) &&
      (/(amount|debit|credit|withdrawal|deposit|dr|cr|narration|description|particulars)/.test(lower))
    ) return i
  }
  return -1
}

/** Strategy A: align tokens to header column positions */
function parseAsTable(lines, headerIdx) {
  const headerLine = lines[headerIdx]
  const headers = tokeniseLine(headerLine)
  const colMap = detectColumns(headers)

  if (!colMap.date || (!colMap.amount && !colMap.debit && !colMap.credit)) return []

  // Find approximate char positions of each header token
  const positions = headers.map((h) => headerLine.indexOf(h))

  function lineToRow(line) {
    const row = {}
    for (let i = 0; i < headers.length; i++) {
      const start = positions[i]
      const end = positions[i + 1] ?? line.length
      row[headers[i]] = line.slice(start, end).trim()
    }
    return row
  }

  const transactions = []
  for (const line of lines.slice(headerIdx + 1)) {
    if (!line.trim() || line.length < 10) continue
    try {
      const row = lineToRow(line)
      const tx = normaliseRow(row, colMap)
      if (tx) transactions.push(tx)
    } catch { /* skip malformed line */ }
  }
  return transactions
}

/** Strategy B: regex scan each line for date + amounts */
function parseByRegex(lines) {
  const transactions = []

  for (const line of lines) {
    const dateMatch = line.match(DATE_RE)
    if (!dateMatch) continue

    const date = parseDate(dateMatch[0])
    if (!date) continue

    // Collect all amounts on the line
    const amounts = []
    let m
    AMOUNT_RE.lastIndex = 0
    while ((m = AMOUNT_RE.exec(line)) !== null) {
      const n = parseAmount(m[1])
      if (!isNaN(n) && n > 0) amounts.push(n)
    }

    if (amounts.length === 0) continue

    // Heuristic: if 2+ amounts, last is often balance; second-to-last is debit/credit
    // If 1 amount, it's the transaction amount
    const amount = amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[0]

    // Description: everything between date and first number
    const dateEnd = line.indexOf(dateMatch[0]) + dateMatch[0].length
    const firstNumMatch = line.slice(dateEnd).search(/\d/)
    const description = firstNumMatch >= 0
      ? line.slice(dateEnd, dateEnd + firstNumMatch).trim()
      : line.slice(dateEnd).trim()

    // Type: look for Dr/Cr keyword near the amount
    const vicinity = line.slice(line.lastIndexOf(String(amounts[amounts.length >= 2 ? amounts.length - 2 : 0]))).toLowerCase()
    const type = /\bcr\b|credit|deposit/.test(vicinity) ? 'credit' : 'debit'

    if (amount > 0 && description) {
      transactions.push({ date, description, amount: parseFloat(amount.toFixed(2)), type })
    }
  }

  return transactions
}

export async function parsePDFFile(filePath) {
  const buf = readFileSync(filePath)
  const data = await pdfParse(buf)
  const lines = data.text.split('\n').map((l) => l.trimEnd())

  const headerIdx = findHeaderLine(lines)

  let transactions = []
  let strategy = 'regex'

  if (headerIdx >= 0) {
    const tableResult = parseAsTable(lines, headerIdx)
    if (tableResult.length > 0) {
      transactions = tableResult
      strategy = 'table'
    }
  }

  if (transactions.length === 0) {
    transactions = parseByRegex(lines)
    strategy = 'regex'
  }

  return { transactions, source: 'pdf', strategy, pages: data.numpages }
}
