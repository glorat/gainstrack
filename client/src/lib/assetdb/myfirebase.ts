import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getAnalytics } from 'firebase/analytics'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: 'AIzaSyBFgCa2tMUSuAWxiyAPa5U90peuqAJNNBo',
  authDomain: 'gainstrack.firebaseapp.com',
  databaseURL: 'https://gainstrack.firebaseio.com',
  projectId: 'gainstrack',
  storageBucket: 'gainstrack.appspot.com',
  messagingSenderId: '248761590066',
  appId: '1:248761590066:web:dcd7d7a8e1028f7b1bf72b',
  measurementId: 'G-H8SQPQVX1S'
}

function getOrInitApp(): FirebaseApp {
  const existing = getApps()
  if (existing.length > 0) return existing[0]
  const app = initializeApp(firebaseConfig)
  console.log('Firebase initialised')
  return app
}

export function myFirestore() {
  return getFirestore(getOrInitApp())
}

export function myAnalytics() {
  return getAnalytics(getOrInitApp())
}

export function myAuth() {
  return getAuth(getOrInitApp())
}

export function myFunctions() {
  return getFunctions(getOrInitApp())
}
