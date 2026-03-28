import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDr8rQ4LXs5GX4hYQLZv6fPgSVuAvW0JdU",
  authDomain: "quiz-maker-c6c92.firebaseapp.com",
  projectId: "quiz-maker-c6c92",
  storageBucket: "quiz-maker-c6c92.firebasestorage.app",
  messagingSenderId: "923455364316",
  appId: "1:923455364316:web:cf76b2b55acf0536356819"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()
export const db = getFirestore(app)