import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { BriefingPage, DeputiesPage, HistoryPage, IncidentPage, MayorDashboardPage, OperationsPage, PlaceholderPage, RegulationsPage, ScenariosPage } from './features/pages'
import { SchoolsKindergartensPage } from './features/schools-kindergartens/SchoolsKindergartensPage'
import { applyMayorTransportParams } from './features/public-transport/navigation'

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
        <Route path="/briefing" element={<BriefingPage />} />
        <Route path="/mayor-dashboard" element={<MayorDashboardPage />} />
        <Route path="/operations" element={<OperationsPage />} />
        <Route path="/incidents/:id" element={<IncidentPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/scenarios" element={<ScenariosPage />} />
        <Route path="/deputies" element={<DeputiesPage />} />
        <Route path="/regulations" element={<RegulationsPage />} />
        <Route path="/public-transport" element={<LegacyPublicTransportRedirect />} />
        <Route path="/schools-kindergartens" element={<SchoolsKindergartensPage />} />
        <Route path="/resources" element={<PlaceholderPage />} />
        <Route path="/reports" element={<PlaceholderPage />} />
        <Route path="/settings" element={<PlaceholderPage />} />
      </Route>
    </Routes>
  )
}
