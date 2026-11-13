import { useCallback, useEffect, useEffectEvent, useState } from 'react'

export interface ApiState<T> {
  /** 最後に読めたデータ(読み直し中は前のデータを残す。失敗したら null) */
  data: T | null
  error: unknown
  loading: boolean
  /** もう一度読み込む */
  reload: () => void
  /** 読み込み済みのデータをサーバーの応答で置きかえる */
  setData: (data: T) => void
}

interface Settled<T> {
  /** どのリクエストの結果か */
  requestKey: string | null
  data: T | null
  error: unknown
}

/**
 * 画面を開いたとき(と key が変わったとき)に API を読む小さなフック。
 * key には、読み直しのきっかけになる値(商品 ID など)を文字列で渡す。
 * 古いリクエストの結果で新しい結果を上書きしない。
 */
export function useApi<T>(fetcher: () => Promise<T>, key = ''): ApiState<T> {
  const [nonce, setNonce] = useState(0)
  const [settled, setSettled] = useState<Settled<T>>({ requestKey: null, data: null, error: null })
  const requestKey = `${key}#${nonce}`
  const run = useEffectEvent(fetcher)

  useEffect(() => {
    let cancelled = false
    run().then(
      (data) => {
        if (!cancelled) setSettled({ requestKey, data, error: null })
      },
      (error: unknown) => {
        if (!cancelled) setSettled({ requestKey, data: null, error })
      },
    )
    return () => {
      cancelled = true
    }
  }, [requestKey])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  const setData = useCallback(
    (data: T) => setSettled((prev) => ({ ...prev, data, error: null })),
    [],
  )

  const loading = settled.requestKey !== requestKey
  return {
    data: settled.data,
    error: loading ? null : settled.error,
    loading,
    reload,
    setData,
  }
}
