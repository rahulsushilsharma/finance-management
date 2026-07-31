/**
 * Seeds the local Firebase emulator with a test user + household + parsed transactions.
 *
 * Usage:
 *   bun scripts/seed-emulator.js <statement-file>
 *
 * Requires emulators running:
 *   firebase emulators:start --only auth,firestore
 */
import { initializeApp } from 'firebase/app'
import {
  getFirestore, connectFirestoreEmulator,
  doc, setDoc, collection, writeBatch, Timestamp,
} from 'firebase/firestore'
import {
  getAuth, connectAuthEmulator,
  createUserWithEmailAndPassword,
} from 'firebase/auth'
import { extname } from 'path'
import { parseCSVFile } from './parsers/csv.js'
import { parseExcelFile } from './parsers/excel.js'
import { parsePDFFile } from './parsers/pdf.js'

const FILE = process.argv[2]
if (!FILE) { console.error('Usage: bun scripts/seed-emulator.js <statement-file>'); process.exit(1) }

// ── Firebase emulator setup ──────────────────────────────────────────────────
const app = initializeApp({
  apiKey: 'demo-key',
  projectId: 'expanse-management-0',
})
const db = getFirestore(app)
const auth = getAuth(app)
connectFirestoreEmulator(db, '127.0.0.1', 8080)
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })

// ── Test credentials ─────────────────────────────────────────────────────────
const EMAIL = 'test@example.com'
const PASSWORD = 'password123'
const HOUSEHOLD_ID = 'test-household'
const ACCOUNT_ID = 'hdfc-main'

// ── Parse the file ───────────────────────────────────────────────────────────
console.log(`\nParsing ${FILE}…`)
const ext = extname(FILE).toLowerCase()
let result
if (['.csv', '.txt'].includes(ext)) result = parseCSVFile(FILE)
else if (['.xlsx', '.xls', '.ods'].includes(ext)) result = parseExcelFile(FILE)
else if (ext === '.pdf') result = await parsePDFFile(FILE)
else { console.error('Unsupported file type:', ext); process.exit(1) }

const { transactions } = result
console.log(`  Parsed ${transactions.length} transactions`)

// ── Create or reuse test user ─────────────────────────────────────────────────
let uid
try {
  const cred = await createUserWithEmailAndPassword(auth, EMAIL, PASSWORD)
  uid = cred.user.uid
  console.log(`  Created user: ${EMAIL} (${uid})`)
} catch (e) {
  if (e.code === 'auth/email-already-in-use') {
    // emulator already has this user from a previous seed — just look up uid via REST
    const res = await fetch(
      `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/expanse-management-0/accounts`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, returnSecureToken: false }) }
    )
    const list = await fetch(
      `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/expanse-management-0/accounts:lookup`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: [EMAIL] }) }
    )
    const data = await list.json()
    uid = data.users?.[0]?.localId
    if (!uid) {
      // fallback: delete all and retry
      await fetch(`http://127.0.0.1:9099/emulator/v1/projects/expanse-management-0/accounts`, { method: 'DELETE' })
      const cred2 = await createUserWithEmailAndPassword(auth, EMAIL, PASSWORD)
      uid = cred2.user.uid
    }
    console.log(`  Reusing existing user: ${EMAIL} (${uid})`)
  } else {
    throw e
  }
}

// ── Write Firestore seed data ─────────────────────────────────────────────────
console.log('\nSeeding Firestore…')

// user doc
await setDoc(doc(db, 'users', uid), {
  householdId: HOUSEHOLD_ID,
  displayName: 'Test User',
  email: EMAIL,
})

// household doc
await setDoc(doc(db, 'households', HOUSEHOLD_ID), {
  name: 'Test Household',
  currency: 'INR',
  createdBy: uid,
})

// household member
await setDoc(doc(db, `households/${HOUSEHOLD_ID}/members`, uid), {
  uid,
  displayName: 'Test User',
  email: EMAIL,
  role: 'admin',
  joinedAt: new Date().toISOString(),
})

// compute closing balance from transactions
const closingBalance = transactions.reduce((bal, tx) => {
  return tx.type === 'credit' ? bal + tx.amount : bal - tx.amount
}, 0)

// account
await setDoc(doc(db, `households/${HOUSEHOLD_ID}/accounts`, ACCOUNT_ID), {
  name: 'HDFC Main',
  type: 'bank',
  balance: parseFloat(closingBalance.toFixed(2)),
  createdAt: new Date().toISOString(),
})

console.log(`  ✓ user, household, member, account`)

// transactions — batch write (Firestore limit: 500 per batch)
const txCol = collection(db, `households/${HOUSEHOLD_ID}/transactions`)
const BATCH_SIZE = 400
let written = 0

for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
  const batch = writeBatch(db)
  const chunk = transactions.slice(i, i + BATCH_SIZE)
  for (const tx of chunk) {
    const ref = doc(txCol)
    batch.set(ref, {
      type: tx.type === 'credit' ? 'income' : 'expense',
      amount: tx.amount,
      description: tx.description,
      category: guessCategory(tx.description),
      date: tx.date,
      accountId: ACCOUNT_ID,
      addedBy: uid,
    })
  }
  await batch.commit()
  written += chunk.length
  process.stdout.write(`\r  ✓ ${written}/${transactions.length} transactions written`)
}

console.log(`\n\n── Done ──────────────────────────────────`)
console.log(`  App:      http://localhost:5173`)
console.log(`  Emulator: http://localhost:4000`)
console.log(`  Login:    ${EMAIL} / ${PASSWORD}`)
console.log()

// ── Simple category guesser ───────────────────────────────────────────────────
function guessCategory(description) {
  const d = description.toLowerCase()
  if (/swiggy|zomato|food|restaurant|cafe|dominos|mcdonalds|kfc|pizza|panda/.test(d)) return 'Food & Dining'
  if (/amazon|flipkart|myntra|shopping|mart|store|bazaar/.test(d)) return 'Shopping'
  if (/uber|ola|grab|metro|irctc|bus|flight|airline|travel/.test(d)) return 'Transport'
  if (/netflix|hotstar|spotify|prime|youtube|entertainment/.test(d)) return 'Entertainment'
  if (/electricity|water|gas|broadband|jio|airtel|vi|bsnl|utility|bill/.test(d)) return 'Utilities'
  if (/hospital|pharmacy|medical|health|doctor|clinic/.test(d)) return 'Healthcare'
  if (/salary|credit|deposit|ach|neft|rtgs|imps/.test(d)) return 'Income'
  if (/emi|loan|insurance/.test(d)) return 'Finance'
  if (/atm|cash/.test(d)) return 'Cash'
  return 'Other'
}
