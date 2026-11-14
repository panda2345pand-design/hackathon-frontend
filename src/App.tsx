import { Center, Loader } from '@mantine/core'
import { type ReactNode, Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth/RequireAuth'
import { AppLayout } from './components/AppLayout'
import { HomePage } from './pages/HomePage'

// ホーム以外のページは、開いたときにはじめて読み込む(最初の表示に要る JS を減らすため)。
// ホームは入口なので、最初のファイルに入れたままにする。
const AboutAiPage = lazy(() => import('./pages/AboutAiPage').then((m) => ({ default: m.AboutAiPage })))
const ItemDetailPage = lazy(() => import('./pages/ItemDetailPage').then((m) => ({ default: m.ItemDetailPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const MyPage = lazy(() => import('./pages/MyPage').then((m) => ({ default: m.MyPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))
const SellPage = lazy(() => import('./pages/SellPage').then((m) => ({ default: m.SellPage })))

/** ページの JS を読み込んでいるあいだの表示。ヘッダー(AppLayout)は出したまま、中身だけ待つ */
function PageLoading() {
  return (
    <Center mih={240} role="status" aria-label="ページを読み込んでいます">
      <Loader />
    </Center>
  )
}

const page = (node: ReactNode) => <Suspense fallback={<PageLoading />}>{node}</Suspense>

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={page(<LoginPage />)} />
        <Route path="items/:id" element={page(<ItemDetailPage />)} />
        <Route path="sell" element={<RequireAuth>{page(<SellPage />)}</RequireAuth>} />
        <Route path="me" element={<RequireAuth>{page(<MyPage />)}</RequireAuth>} />
        <Route path="about-ai" element={page(<AboutAiPage />)} />
        <Route path="*" element={page(<NotFoundPage />)} />
      </Route>
    </Routes>
  )
}

export default App
