import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Replace these values with your Firebase project config
// Go to: https://console.firebase.google.com → Project Settings → Your apps → Firebase SDK snippet
const firebaseConfig = {
  apiKey: "AIzaSyBGxkeZ7IO29aGC_qKMo3RwR5jKKDlSA0c",
  authDomain: "my-app-916d6.firebaseapp.com",
  projectId: "my-app-916d6",
  storageBucket: "my-app-916d6.firebasestorage.app",
  messagingSenderId: "807404371833",
  appId: "1:807404371833:web:362e3b76c74e64a02639a8",
  measurementId: "G-QR04V64L4H"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export default app
