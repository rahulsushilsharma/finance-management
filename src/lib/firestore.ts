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
  deleteField,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Transaction, Budget } from '@/types'

const txCol = (hid: string) => collection(db, 'households', hid, 'transactions')
const budgetCol = (hid: string) => collection(db, 'households', hid, 'budgets')
const memberCol = (hid: string) => collection(db, 'households', hid, 'members')

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

export const addTransaction = (hid: string, t: Omit<Transaction, 'id'>) =>
  addDoc(txCol(hid), t)

export const updateTransaction = (hid: string, id: string, t: Partial<Omit<Transaction, 'id'>>) =>
  updateDoc(doc(txCol(hid), id), t)

export const deleteTransaction = (hid: string, id: string) =>
  deleteDoc(doc(txCol(hid), id))

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

export async function leaveHousehold(uid: string, hid: string): Promise<void> {
  await deleteDoc(doc(memberCol(hid), uid))
  await updateDoc(doc(db, 'users', uid), { householdId: deleteField() })
}

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
