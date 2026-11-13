const FIREBASE_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'メールアドレスかパスワードが違います',
  'auth/invalid-email': 'メールアドレスの形が正しくありません',
  'auth/user-not-found': 'メールアドレスかパスワードが違います',
  'auth/wrong-password': 'メールアドレスかパスワードが違います',
  'auth/email-already-in-use': 'このメールアドレスはすでに登録されています。ログインしてください',
  'auth/weak-password': 'パスワードは 6 文字以上にしてください',
  'auth/too-many-requests': '試行回数が多すぎます。しばらく待ってからお試しください',
  'auth/network-request-failed': '通信に失敗しました。通信環境を確認してください',
}

/** Firebase のエラー(code つき)を日本語の Error にする。それ以外はそのまま返す */
export function toAuthError(error: unknown): unknown {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code
    if (typeof code === 'string' && code.startsWith('auth/')) {
      return new Error(FIREBASE_MESSAGES[code] ?? `ログインに失敗しました(${code})`)
    }
  }
  return error
}
