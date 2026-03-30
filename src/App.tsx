import { Suspense, lazy, type ComponentType } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { applyMayorTransportParams } from './features/public-transport/navigation'

const BriefingPage = lazy(() => import('./features/pages/BriefingPage'))
const MayorDashboardPage = lazy(() => import('./features/pages/MayorDashboardPage'))
const OperationsPage = lazy(() => import('./features/pages/OperationsPage'))
const IncidentPage = lazy(() => import('./features/pages/IncidentPage'))
const HistoryPage = lazy(() => import('./features/pages/HistoryPage'))
const ScenariosPage = lazy(() => import('./features/pages/ScenariosPage'))
const DeputiesPage = lazy(() => import('./features/pages/DeputiesPage'))
const RegulationsPage = lazy(() => import('./features/pages/RegulationsPage'))
const PlaceholderPage = lazy(() => import('./features/pages/PlaceholderPage'))

const renderLazyRoute = (Page: ComponentType) => (
  <Suspense fallback={<div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Загружаю раздел…</div>}>
    <Page />
  </Suspense>
)

function LegacyPublicTransportRedirect() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  applyMayorTransportParams(params, 'when-missing')
  return <Navigate to={`/mayor-dashboard?${params.toString()}`} replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/mayor-dashboard" />} />
        <Route path="/briefing" element={renderLazyRoute(BriefingPage)} />
        <Route path="/mayor-dashboard" element={renderLazyRoute(MayorDashboardPage)} />
        <Route path="/operations" element={renderLazyRoute(OperationsPage)} />
        <Route path="/incidents/:id" element={renderLazyRoute(IncidentPage)} />
        <Route path="/history" element={renderLazyRoute(HistoryPage)} />
        <Route path="/scenarios" element={renderLazyRoute(ScenariosPage)} />
        <Route path="/deputies" element={renderLazyRoute(DeputiesPage)} />
        <Route path="/regulations" element={renderLazyRoute(RegulationsPage)} />
        <Route path="/public-transport" element={<LegacyPublicTransportRedirect />} />
        <Route path="/resources" element={renderLazyRoute(PlaceholderPage)} />
        <Route path="/reports" element={renderLazyRoute(PlaceholderPage)} />
        <Route path="/settings" element={renderLazyRoute(PlaceholderPage)} />
      </Route>
    </Routes>
  )
}
