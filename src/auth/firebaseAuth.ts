import { type FirebaseApp, initializeApp } from 'firebase/app'
import {
  type Auth,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth'

// Firebase Authentication(VITE_AUTH_MODE=firebase)。
// このファイルは firebase モードのときだけ動的に読み込む(dev モードの画面を軽くするため)。

export interface FirebaseIdentity {
  displayName: string | null
  email: string | null
}

let app: FirebaseApp | null = null

function auth(): Auth {
  if (!app) {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
    if (!apiKey) {
      throw new Error('Firebase の設定(VITE_FIREBASE_*)がありません。.env を確認してください')
    }
    app = initializeApp({
      apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    })
  }
  return getAuth(app)
}

/** ログイン状態の変化を受け取る。戻り値で購読をやめる */
export function subscribe(listener: (identity: FirebaseIdentity | null) => void): () => void {
  return onAuthStateChanged(auth(), (user) => {
    listener(user ? { displayName: user.displayName, email: user.email } : null)
  })
}

/** API に送る ID トークン。未ログインなら null */
export async function getIdToken(): Promise<string | null> {
  const a = auth()
  await a.authStateReady()
  return a.currentUser ? a.currentUser.getIdToken() : null
}

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth(), email, password)
}

export async function signUp(email: string, password: string, name: string): Promise<void> {
  const credential = await createUserWithEmailAndPassword(auth(), email, password)
  await updateProfile(credential.user, { displayName: name })
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth())
}
