#!/usr/bin/env node
/**
 * Usage:
 *   bun scripts/parse-statement.js <file>
 *   bun scripts/parse-statement.js <file> --json        # raw JSON output
 *   bun scripts/parse-statement.js <file> --debug       # show column map + raw rows
 *
 * Outputs a summary + first 10 parsed transactions.
 * Pipe to a file with > out.json for full output.
 */
import { extname } from 'path'
import { parseCSVFile } from './parsers/csv.js'
import { parseExcelFile } from './parsers/excel.js'
import { parsePDFFile } from './parsers/pdf.js'

const [,, filePath, ...flags] = process.argv
const jsonMode = flags.includes('--json')
const debugMode = flags.includes('--debug')

if (!filePath) {
  console.error('Usage: bun scripts/parse-statement.js <file> [--json] [--debug]')
  process.exit(1)
}

const ext = extname(filePath).toLowerCase()

let result
if (['.csv', '.txt'].includes(ext)) {
  result = parseCSVFile(filePath)
} else if (['.xlsx', '.xls', '.ods'].includes(ext)) {
  result = parseExcelFile(filePath)
} else if (ext === '.pdf') {
  result = await parsePDFFile(filePath)
} else {
  console.error(`Unsupported file type: ${ext}`)
  process.exit(1)
}

const { transactions, colMap, source, ...meta } = result

if (jsonMode) {
  console.log(JSON.stringify(transactions, null, 2))
  process.exit(0)
}

// Human-readable summary
console.log(`\n── Parse result ──────────────────────────`)
console.log(`  Source   : ${source}${meta.sheet ? ` (sheet: ${meta.sheet})` : ''}${meta.strategy ? ` [strategy: ${meta.strategy}]` : ''}${meta.pages ? ` · ${meta.pages} pages` : ''}`)
console.log(`  Found    : ${transactions.length} transactions`)

if (debugMode && colMap) {
  console.log(`\n── Column map ────────────────────────────`)
  for (const [field, header] of Object.entries(colMap)) {
    console.log(`  ${field.padEnd(12)} → "${header}"`)
  }
}

if (transactions.length === 0) {
  console.log(`\n  ⚠  No transactions parsed. Try --debug to inspect column detection.`)
  process.exit(0)
}

// Stats
const debits = transactions.filter((t) => t.type === 'debit')
const credits = transactions.filter((t) => t.type === 'credit')
const totalDebit = debits.reduce((s, t) => s + t.amount, 0)
const totalCredit = credits.reduce((s, t) => s + t.amount, 0)
const dates = transactions.map((t) => t.date).sort()

console.log(`\n── Summary ───────────────────────────────`)
console.log(`  Period   : ${dates[0]}  →  ${dates[dates.length - 1]}`)
console.log(`  Debits   : ${debits.length} txns   total ${totalDebit.toFixed(2)}`)
console.log(`  Credits  : ${credits.length} txns   total ${totalCredit.toFixed(2)}`)

console.log(`\n── First 10 transactions ─────────────────`)
for (const t of transactions.slice(0, 10)) {
  const sign = t.type === 'debit' ? '−' : '+'
  const desc = t.description.slice(0, 45).padEnd(45)
  console.log(`  ${t.date}  ${sign}${String(t.amount.toFixed(2)).padStart(10)}  ${desc}`)
}
if (transactions.length > 10) {
  console.log(`  … and ${transactions.length - 10} more`)
}

console.log(`\n  Tip: add --json to get full output as JSON`)
console.log()
