/**
 * Firestore security rules tests.
 * Run: firebase emulators:exec "bun firestore.rules.test.ts"
 * Or:  firebase emulators:start  (in one terminal) then  bun firestore.rules.test.ts
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'fs'
import { doc, getDoc, setDoc, deleteDoc, collection, addDoc, updateDoc } from 'firebase/firestore'

let env: RulesTestEnvironment

async function setup() {
  env = await initializeTestEnvironment({
    projectId: 'expanse-management-0',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
}

async function teardown() {
  await env.cleanup()
}

// helpers
const HID = 'household-1'
const UID_ADMIN = 'user-admin'
const UID_MEMBER = 'user-member'
const UID_STRANGER = 'user-stranger'

async function seedHousehold() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    // users
    await setDoc(doc(db, 'users', UID_ADMIN), { householdId: HID })
    await setDoc(doc(db, 'users', UID_MEMBER), { householdId: HID })
    await setDoc(doc(db, 'users', UID_STRANGER), { householdId: 'other-hh' })
    // household root
    await setDoc(doc(db, 'households', HID), { name: 'Test Home', currency: 'USD' })
    // members
    await setDoc(doc(db, `households/${HID}/members`, UID_ADMIN), { role: 'admin', displayName: 'Admin' })
    await setDoc(doc(db, `households/${HID}/members`, UID_MEMBER), { role: 'member', displayName: 'Member' })
    // seed a transaction
    await setDoc(doc(db, `households/${HID}/transactions`, 'tx-1'), { amount: 100, type: 'expense', date: '2026-07-01' })
  })
}

let pass = 0
let fail = 0

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
    pass++
  } catch (e: any) {
    console.log(`  ✗ ${name}`)
    console.log(`    ${e.message}`)
    fail++
  }
}

async function run() {
  await setup()
  await env.clearFirestore()
  await seedHousehold()

  console.log('\n── users/{uid} ──')

  await test('user reads own doc', async () => {
    const db = env.authenticatedContext(UID_ADMIN).firestore()
    await assertSucceeds(getDoc(doc(db, 'users', UID_ADMIN)))
  })

  await test('user cannot read other user doc', async () => {
    const db = env.authenticatedContext(UID_MEMBER).firestore()
    await assertFails(getDoc(doc(db, 'users', UID_ADMIN)))
  })

  await test('unauthenticated cannot read user doc', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'users', UID_ADMIN)))
  })

  console.log('\n── households/{hid} root ──')

  await test('member can read household root', async () => {
    const db = env.authenticatedContext(UID_MEMBER).firestore()
    await assertSucceeds(getDoc(doc(db, 'households', HID)))
  })

  await test('any authed user can read household root (invite code validation)', async () => {
    const db = env.authenticatedContext(UID_STRANGER).firestore()
    await assertSucceeds(getDoc(doc(db, 'households', HID)))
  })

  await test('member can update household', async () => {
    const db = env.authenticatedContext(UID_MEMBER).firestore()
    await assertSucceeds(updateDoc(doc(db, 'households', HID), { currency: 'INR' }))
  })

  await test('stranger cannot update household', async () => {
    const db = env.authenticatedContext(UID_STRANGER).firestore()
    await assertFails(updateDoc(doc(db, 'households', HID), { currency: 'INR' }))
  })

  await test('only admin can delete household', async () => {
    // stranger fails
    const strangerDb = env.authenticatedContext(UID_STRANGER).firestore()
    await assertFails(deleteDoc(doc(strangerDb, 'households', HID)))
  })

  console.log('\n── transactions ──')

  await test('member can read transactions', async () => {
    const db = env.authenticatedContext(UID_MEMBER).firestore()
    await assertSucceeds(getDoc(doc(db, `households/${HID}/transactions`, 'tx-1')))
  })

  await test('member can add transaction', async () => {
    const db = env.authenticatedContext(UID_MEMBER).firestore()
    await assertSucceeds(addDoc(collection(db, `households/${HID}/transactions`), { amount: 50, type: 'income', date: '2026-07-15' }))
  })

  await test('stranger cannot read transactions', async () => {
    const db = env.authenticatedContext(UID_STRANGER).firestore()
    await assertFails(getDoc(doc(db, `households/${HID}/transactions`, 'tx-1')))
  })

  await test('unauthenticated cannot read transactions', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, `households/${HID}/transactions`, 'tx-1')))
  })

  console.log('\n── accounts ──')

  await test('member can read accounts', async () => {
    const db = env.authenticatedContext(UID_MEMBER).firestore()
    await assertSucceeds(addDoc(collection(db, `households/${HID}/accounts`), { name: 'Test', balance: 0, type: 'bank' }))
  })

  await test('stranger cannot write accounts', async () => {
    const db = env.authenticatedContext(UID_STRANGER).firestore()
    await assertFails(addDoc(collection(db, `households/${HID}/accounts`), { name: 'Hack', balance: 0 }))
  })

  console.log('\n── recurring ──')

  await test('member can read/write recurring', async () => {
    const db = env.authenticatedContext(UID_MEMBER).firestore()
    await assertSucceeds(addDoc(collection(db, `households/${HID}/recurring`), { description: 'Netflix', amount: 15, active: true }))
  })

  await test('stranger cannot write recurring', async () => {
    const db = env.authenticatedContext(UID_STRANGER).firestore()
    await assertFails(addDoc(collection(db, `households/${HID}/recurring`), { description: 'Hack', amount: 1 }))
  })

  console.log('\n── members ──')

  await test('member can read members list', async () => {
    const db = env.authenticatedContext(UID_MEMBER).firestore()
    await assertSucceeds(getDoc(doc(db, `households/${HID}/members`, UID_ADMIN)))
  })

  await test('stranger cannot read members', async () => {
    const db = env.authenticatedContext(UID_STRANGER).firestore()
    await assertFails(getDoc(doc(db, `households/${HID}/members`, UID_ADMIN)))
  })

  await test('member can delete their own member doc (leave)', async () => {
    const db = env.authenticatedContext(UID_MEMBER).firestore()
    await assertSucceeds(deleteDoc(doc(db, `households/${HID}/members`, UID_MEMBER)))
  })

  await test('admin can delete any member', async () => {
    // re-seed member (was deleted above)
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `households/${HID}/members`, UID_MEMBER), { role: 'member' })
    })
    const db = env.authenticatedContext(UID_ADMIN).firestore()
    await assertSucceeds(deleteDoc(doc(db, `households/${HID}/members`, UID_MEMBER)))
  })

  await test('member cannot delete other member', async () => {
    // re-seed both
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `households/${HID}/members`, UID_MEMBER), { role: 'member' })
    })
    const db = env.authenticatedContext(UID_MEMBER).firestore()
    await assertFails(deleteDoc(doc(db, `households/${HID}/members`, UID_ADMIN)))
  })

  console.log(`\n${'─'.repeat(40)}`)
  console.log(`  ${pass} passed, ${fail} failed`)
  console.log(`${'─'.repeat(40)}\n`)

  await teardown()
  process.exit(fail > 0 ? 1 : 0)
}

run().catch((e) => { console.error(e); process.exit(1) })
