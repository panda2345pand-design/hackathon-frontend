import { useEffect, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

type Health = { status: string }

function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch((e: Error) => setError(e.message))
  }, [])

  return (
    <main>
      <h1>Nego</h1>
      <p>次世代フリマアプリ(UTTC 10期 ハッカソン)</p>
      <p>
        バックエンド({API_URL}):{' '}
        {health ? `接続OK(${health.status})` : error ? `つながらない(${error})` : '確認中…'}
      </p>
    </main>
  )
}

export default App
