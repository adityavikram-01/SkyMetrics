import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import { AuthProvider } from './AuthContext'
import { LocaleProvider } from './LocaleContext'
import { RequireRole, AreaLayout } from './AreaLayout'
import LoginPage from './LoginPage'
import WorkspaceLogin from './WorkspaceLogin'
import LandingPage from './LandingPage'
import LoadingScreen from './LoadingScreen'
const ConsumerPage = lazy(() => import('./ConsumerPage'))
const GovernmentPage = lazy(() => import('./GovernmentPage'))
const AccountPage = lazy(() => import('./AccountPortal'))
const ProfilePage = lazy(() => import('./ProfilePage'))
const PartnerPage = lazy(() => import('./PartnerPortal'))
const AdminPage = lazy(() => import('./AdminPortal'))
const HelpPage = lazy(() => import('./HelpPage'))

function LegacyRedirect({ to }) {
  const { search, hash } = useLocation()
  return <Navigate to={`${to}${search}${hash}`} replace/>
}

export default function App() {
  return <BrowserRouter><AuthProvider><LocaleProvider><Suspense fallback={<LoadingScreen/>}><Routes>
    <Route path="/" element={<LandingPage/>}/>
    <Route path="/users" element={<RequireRole roles={['TRAVELLER','GOV_ANALYST','PARTNER','ADMIN']} section="flights" title="Flight prices"><ConsumerPage view="decision"/></RequireRole>}/>
    <Route path="/users/insights" element={<RequireRole roles={['TRAVELLER','GOV_ANALYST','PARTNER','ADMIN']} section="insights" title="Route insights"><ConsumerPage view="route"/></RequireRole>}/>
    <Route path="/users/trends" element={<RequireRole roles={['TRAVELLER','GOV_ANALYST','PARTNER','ADMIN']} section="market" title="Fare trends"><ConsumerPage view="pulse"/></RequireRole>}/>
    <Route path="/flights" element={<LegacyRedirect to="/users"/>}/>
    <Route path="/insights" element={<LegacyRedirect to="/users/insights"/>}/>
    <Route path="/market" element={<LegacyRedirect to="/users/trends"/>}/>
    <Route path="/login" element={<LoginPage/>}/>
    <Route path="/government/login" element={<WorkspaceLogin type="government"/>}/>
    <Route path="/developer/login" element={<WorkspaceLogin type="developer"/>}/>
    <Route path="/admin/login" element={<WorkspaceLogin type="admin"/>}/>
    <Route path="/help" element={<HelpPage/>}/>
    <Route path="/users/account" element={<RequireRole roles={['TRAVELLER','GOV_ANALYST','PARTNER','ADMIN']} section="account" title="Your account"><AccountPage/></RequireRole>}/>
    <Route path="/users/profile" element={<RequireRole roles={['TRAVELLER','GOV_ANALYST','PARTNER','ADMIN']} section="account" title="Your profile"><ProfilePage/></RequireRole>}/>
    <Route path="/account" element={<LegacyRedirect to="/users/account"/>}/>
    <Route path="/profile" element={<LegacyRedirect to="/users/profile"/>}/>
    <Route path="/government" element={<RequireRole roles={['GOV_ANALYST','ADMIN']} section="policy" title="Government workspace"><AreaLayout section="policy" eyebrow="GOVERNMENT WORKSPACE" title="India airfare observatory" description="A research view of matched fare movements across the simulated dataset."><GovernmentPage/></AreaLayout></RequireRole>}/>
    <Route path="/policy" element={<LegacyRedirect to="/government"/>}/>
    <Route path="/developer" element={<RequireRole roles={['PARTNER','ADMIN']} section="developers" title="Developer workspace"><PartnerPage/></RequireRole>}/>
    <Route path="/developers" element={<LegacyRedirect to="/developer"/>}/>
    <Route path="/admin" element={<RequireRole roles={['ADMIN']} section="admin" title="Operations workspace"><AdminPage/></RequireRole>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></Suspense></LocaleProvider></AuthProvider></BrowserRouter>
}
