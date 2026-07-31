/**
 * Heuristically maps arbitrary column headers to canonical fields:
 *   date | description | amount | debit | credit | balance | type
 *
 * Each bank names columns differently:
 *   date      → Date, Txn Date, Transaction Date, Value Date, Posted Date…
 *   debit     → Debit, Withdrawal, Dr, Dr Amount, Debit Amount…
 *   credit    → Credit, Deposit, Cr, Cr Amount, Credit Amount…
 *   amount    → Amount, Transaction Amount (may be signed: negative = debit)
 *   description → Narration, Description, Particulars, Remarks, Details…
 *   balance   → Balance, Running Balance, Closing Balance…
 */

const PATTERNS = {
  date: [/\bdate\b/i, /\btxn.?date\b/i, /\btransaction.?date\b/i, /\bvalue.?date\b/i, /\bposted\b/i, /\bposting\b/i],
  description: [/\bnarration\b/i, /\bdescription\b/i, /\bparticulars\b/i, /\bremarks\b/i, /\bdetails\b/i, /\btransaction\b/i, /\bdescr\b/i, /\bpayee\b/i, /\bmemo\b/i],
  debit: [/\bwithdrawal.?amt\b/i, /\bdebit.?amt\b/i, /\bdr.?amt\b/i, /\bwithdrawal\b/i, /\bdebit\b/i, /\bdr\.?\b/i, /\bwithdrawals\b/i],
  credit: [/\bdeposit.?amt\b/i, /\bcredit.?amt\b/i, /\bcr.?amt\b/i, /\bdeposit\b/i, /\bcredit\b/i, /\bcr\.?\b/i, /\bdeposits\b/i],
  amount: [/^amount$/i, /\btransaction.?amount\b/i, /\btxn.?amount\b/i, /\bamt\b/i],
  balance: [/\bbalance\b/i, /\bclosing\b/i, /\brunning.?bal\b/i, /\bavail\b/i],
  type: [/\btype\b/i, /\btxn.?type\b/i, /\btransaction.?type\b/i, /\bindicator\b/i, /\bdr.?\/?\s?cr\b/i],
}

/**
 * @param {string[]} headers - raw column names from the file
 * @returns {Record<string, string>} map of canonical field → actual header
 */
export function detectColumns(headers) {
  const map = {}
  const used = new Set()

  for (const [field, patterns] of Object.entries(PATTERNS)) {
    for (const header of headers) {
      if (used.has(header)) continue
      if (patterns.some((re) => re.test(header.trim()))) {
        map[field] = header
        used.add(header)
        break
      }
    }
  }

  return map
}

/**
 * Parse a raw cell value into a float. Handles:
 *   "1,23,456.78"  →  123456.78
 *   "(500.00)"     →  -500        (accounting negative)
 *   "Dr 500"       →  500
 *   ""             →  NaN
 */
export function parseAmount(raw) {
  if (raw == null) return NaN
  const s = String(raw).trim()
  if (!s || s === '-') return NaN
  const negative = s.startsWith('(') && s.endsWith(')')
  const cleaned = s.replace(/[^0-9.]/g, '')
  const n = parseFloat(cleaned)
  return negative ? -n : n
}

/**
 * Normalise a date string to YYYY-MM-DD.
 * Tries common Indian/international formats.
 */
export function parseDate(raw) {
  if (!raw) return null
  const s = String(raw).trim()

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const y = parseInt(s.slice(0, 4))
    return y >= 2000 && y <= 2100 ? s.slice(0, 10) : null
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD/MM/YY
  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/)
  if (dmy) {
    const [, d, m, y] = dmy
    const year = y.length === 2 ? `20${y}` : y
    if (parseInt(year) < 2000 || parseInt(year) > 2100) return null
    if (parseInt(m) > 12) return `${year}-${d.padStart(2, '0')}-${m.padStart(2, '0')}`
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // MM/DD/YYYY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (mdy) {
    const [, m, d, y] = mdy
    const year = y.length === 2 ? `20${y}` : y
    // heuristic: if m > 12 it's actually day-first
    if (parseInt(m) > 12) return `${year}-${d.padStart(2, '0')}-${m.padStart(2, '0')}`
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // "15 Jul 2024" or "Jul 15, 2024"
  const attempt = new Date(s)
  if (!isNaN(attempt)) return attempt.toISOString().slice(0, 10)

  return null
}

/**
 * Given a detected column map + one row object, produce a normalised transaction:
 * { date, description, amount, type: 'debit'|'credit' }
 * Returns null if the row is not a valid transaction (header repeat, total row, etc.)
 */
export function normaliseRow(row, colMap) {
  const date = parseDate(row[colMap.date])
  if (!date) return null  // skip rows without a date (totals, blank lines, etc.)

  const description = String(row[colMap.description] ?? '').trim()
  if (!description) return null  // skip totals/summary rows with no description

  let amount = NaN
  let type = null

  if (colMap.debit && colMap.credit) {
    // Two-column debit/credit format (most Indian banks)
    const dr = parseAmount(row[colMap.debit])
    const cr = parseAmount(row[colMap.credit])
    if (!isNaN(dr) && dr > 0) { amount = dr; type = 'debit' }
    else if (!isNaN(cr) && cr > 0) { amount = cr; type = 'credit' }
    else return null
  } else if (colMap.amount) {
    // Single signed amount column
    amount = parseAmount(row[colMap.amount])
    if (isNaN(amount)) return null
    // Determine direction from type column or sign
    if (colMap.type) {
      const t = String(row[colMap.type] ?? '').trim().toLowerCase()
      type = /cr|credit|deposit|in/i.test(t) ? 'credit' : 'debit'
    } else {
      type = amount < 0 ? 'debit' : 'credit'
      amount = Math.abs(amount)
    }
  } else {
    return null
  }

  if (!amount || amount <= 0) return null

  return { date, description, amount: parseFloat(amount.toFixed(2)), type }
}
