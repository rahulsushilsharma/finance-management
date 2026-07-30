import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  setDoc,
  getDoc,
  getDocs,
  deleteField,
  writeBatch,
  increment,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Transaction, Budget, Account, AccountType, TransactionType } from '@/types'

function balanceDelta(txType: TransactionType, amount: number, accountType: AccountType): number {
  if (accountType === 'credit') return txType === 'expense' ? amount : -amount
  return txType === 'income' ? amount : -amount
}

const txCol = (hid: string) => collection(db, 'households', hid, 'transactions')
const budgetCol = (hid: string) => collection(db, 'households', hid, 'budgets')
const memberCol = (hid: string) => collection(db, 'households', hid, 'members')
const accountCol = (hid: string) => collection(db, 'households', hid, 'accounts')

// Transactions
export function listenTransactions(
  hid: string,
  month: string,
  cb: (txns: Transaction[]) => void
): Unsubscribe {
  const start = `${month}-01`
  const end = `${month}-31`
  const q = query(txCol(hid), where('date', '>=', start), where('date', '<=', end))
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transaction))
  )
}

export async function addTransaction(
  hid: string,
  t: Omit<Transaction, 'id'>,
  accountType?: AccountType
): Promise<void> {
  const batch = writeBatch(db)
  batch.set(doc(txCol(hid)), t)
  if (t.accountId && accountType) {
    batch.update(doc(accountCol(hid), t.accountId), { balance: increment(balanceDelta(t.type, t.amount, accountType)) })
  }
  await batch.commit()
}

export async function updateTransaction(
  hid: string,
  id: string,
  oldT: Pick<Transaction, 'type' | 'amount' | 'accountId'>,
  newT: Partial<Omit<Transaction, 'id'>>,
  accountType?: AccountType
): Promise<void> {
  const batch = writeBatch(db)
  batch.update(doc(txCol(hid), id), newT)
  const newAccountId = newT.accountId ?? oldT.accountId
  const newType = (newT.type ?? oldT.type) as TransactionType
  const newAmount = newT.amount ?? oldT.amount
  if (accountType) {
    if (oldT.accountId && oldT.accountId === newAccountId) {
      // same account: combine into one increment to avoid batch last-write-wins clobbering the revert
      const delta = balanceDelta(newType, newAmount, accountType) - balanceDelta(oldT.type, oldT.amount, accountType)
      if (delta !== 0) batch.update(doc(accountCol(hid), oldT.accountId), { balance: increment(delta) })
    } else {
      if (oldT.accountId) batch.update(doc(accountCol(hid), oldT.accountId), { balance: increment(-balanceDelta(oldT.type, oldT.amount, accountType)) })
      if (newAccountId) batch.update(doc(accountCol(hid), newAccountId), { balance: increment(balanceDelta(newType, newAmount, accountType)) })
    }
  }
  await batch.commit()
}

export async function deleteTransaction(
  hid: string,
  id: string,
  t?: Pick<Transaction, 'type' | 'amount' | 'accountId'>,
  accountType?: AccountType
): Promise<void> {
  const batch = writeBatch(db)
  batch.delete(doc(txCol(hid), id))
  if (t?.accountId && accountType) {
    batch.update(doc(accountCol(hid), t.accountId), { balance: increment(-balanceDelta(t.type, t.amount, accountType)) })
  }
  await batch.commit()
}

// Budgets
export function listenBudgets(
  hid: string,
  month: string,
  cb: (budgets: Budget[]) => void
): Unsubscribe {
  const q = query(budgetCol(hid), where('month', '==', month))
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Budget))
  )
}

export const addBudget = (hid: string, b: Omit<Budget, 'id'>) =>
  addDoc(budgetCol(hid), b)

export const updateBudget = (hid: string, id: string, b: Partial<Omit<Budget, 'id'>>) =>
  updateDoc(doc(budgetCol(hid), id), b)

export const deleteBudget = (hid: string, id: string) =>
  deleteDoc(doc(budgetCol(hid), id))

export async function getBudgetsForMonth(hid: string, month: string): Promise<Budget[]> {
  const snap = await getDocs(query(budgetCol(hid), where('month', '==', month)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Budget)
}

// Members
export interface Member {
  uid: string
  displayName: string
  email: string
  role: 'admin' | 'member'
  joinedAt: string
}

export function listenMembers(hid: string, cb: (members: Member[]) => void): Unsubscribe {
  return onSnapshot(memberCol(hid), (snap) =>
    cb(snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as Member))
  )
}

export async function removeMember(hid: string, uid: string): Promise<void> {
  await deleteDoc(doc(memberCol(hid), uid))
  await updateDoc(doc(db, 'users', uid), { householdId: deleteField() })
}

export async function transferAdmin(hid: string, fromUid: string, toUid: string): Promise<void> {
  await updateDoc(doc(memberCol(hid), fromUid), { role: 'member' })
  await updateDoc(doc(memberCol(hid), toUid), { role: 'admin' })
}

export async function leaveHousehold(uid: string, hid: string): Promise<void> {
  await deleteDoc(doc(memberCol(hid), uid))
  await updateDoc(doc(db, 'users', uid), { householdId: deleteField() })
}

export async function deleteHousehold(uid: string, hid: string): Promise<void> {
  // sole admin leaving — remove self from members and clear householdId
  // subcollections (transactions, budgets) are orphaned but harmless at family scale
  await deleteDoc(doc(memberCol(hid), uid))
  await deleteDoc(doc(db, 'households', hid))
  await updateDoc(doc(db, 'users', uid), { householdId: deleteField() })
}

// Accounts
export function listenAccounts(hid: string, cb: (accounts: Account[]) => void): Unsubscribe {
  return onSnapshot(accountCol(hid), (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Account))
  )
}

export const addAccount = (hid: string, a: Omit<Account, 'id'>) =>
  addDoc(accountCol(hid), a)

export const updateAccount = (hid: string, id: string, a: Partial<Omit<Account, 'id'>>) =>
  updateDoc(doc(accountCol(hid), id), a)

export const deleteAccount = (hid: string, id: string) =>
  deleteDoc(doc(accountCol(hid), id))

// Custom categories
export async function updateCustomCategories(
  hid: string,
  categories: { expense: string[]; income: string[] }
): Promise<void> {
  await updateDoc(doc(db, 'households', hid), { customCategories: categories })
}

export interface HouseholdData {
  customCategories?: { expense: string[]; income: string[] }
  currency?: string
}

export function listenHousehold(hid: string, cb: (data: HouseholdData) => void): Unsubscribe {
  return onSnapshot(doc(db, 'households', hid), (snap) => cb(snap.data() ?? {}))
}

export const updateCurrency = (hid: string, currency: string) =>
  updateDoc(doc(db, 'households', hid), { currency })

// Household / user profile
export async function getUserHouseholdId(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? ((snap.data().householdId as string) ?? null) : null
}

export async function updateDisplayName(uid: string, hid: string, displayName: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { displayName })
  await updateDoc(doc(memberCol(hid), uid), { displayName })
}

export async function createHousehold(uid: string, displayName: string, email: string): Promise<string> {
  const hRef = doc(collection(db, 'households'))
  // write user first so rules pass when creating the household doc
  await setDoc(doc(db, 'users', uid), { householdId: hRef.id, displayName, email })
  await setDoc(hRef, { createdBy: uid, createdAt: new Date().toISOString() })
  await setDoc(doc(memberCol(hRef.id), uid), {
    displayName, email, role: 'admin', joinedAt: new Date().toISOString(),
  })
  return hRef.id
}

export async function joinHousehold(uid: string, householdId: string, displayName: string, email: string): Promise<boolean> {
  const hSnap = await getDoc(doc(db, 'households', householdId))
  if (!hSnap.exists()) return false
  await setDoc(doc(db, 'users', uid), { householdId, displayName, email })
  await setDoc(doc(memberCol(householdId), uid), {
    displayName, email, role: 'member', joinedAt: new Date().toISOString(),
  })
  return true
}
