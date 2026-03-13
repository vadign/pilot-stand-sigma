import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { BriefingPage, DeputiesPage, HistoryPage, IncidentPage, MayorDashboardPage, OperationsPage, PlaceholderPage, RegulationsPage, ScenariosPage } from './features/pages'

export default function App(){
  return <Routes><Route element={<Layout/>}><Route path='/' element={<Navigate to='/mayor-dashboard'/>}/><Route path='/briefing' element={<BriefingPage/>}/><Route path='/mayor-dashboard' element={<MayorDashboardPage/>}/><Route path='/operations' element={<OperationsPage/>}/><Route path='/incidents/:id' element={<IncidentPage/>}/><Route path='/history' element={<HistoryPage/>}/><Route path='/scenarios' element={<ScenariosPage/>}/><Route path='/deputies' element={<DeputiesPage/>}/><Route path='/regulations' element={<RegulationsPage/>}/><Route path='/resources' element={<PlaceholderPage/>}/><Route path='/reports' element={<PlaceholderPage/>}/><Route path='/settings' element={<PlaceholderPage/>}/></Route></Routes>
}
