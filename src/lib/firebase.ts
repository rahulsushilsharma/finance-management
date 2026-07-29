import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: "AIzaSyAnI-uFQEUvXfIrj1dPH3gqouACHVw29y0",
  authDomain: "expanse-management-0.firebaseapp.com",
  projectId: "expanse-management-0",
  storageBucket: "expanse-management-0.firebasestorage.app",
  messagingSenderId: "1067734578750",
  appId: "1:1067734578750:web:efa5bfc85f426f76b1036f",
  measurementId: "G-J27DG82GN2",
}

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const analytics = getAnalytics(app)
