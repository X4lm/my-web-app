import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const Login = lazy(() => import('@/pages/Login'))
const Signup = lazy(() => import('@/pages/Signup'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Properties = lazy(() => import('@/pages/Properties'))
const PropertyDetail = lazy(() => import('@/pages/PropertyDetail'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const AlertsPage = lazy(() => import('@/pages/AlertsPage'))

function PrivateRoute({ children }) {
  const { currentUser } = useAuth()
  return currentUser ? children : <Navigate to="/login" />
}

function PublicRoute({ children }) {
  const { currentUser } = useAuth()
  return !currentUser ? children : <Navigate to="/" />
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/properties" element={<PrivateRoute><Properties /></PrivateRoute>} />
        <Route path="/properties/:id" element={<PrivateRoute><PropertyDetail /></PrivateRoute>} />
        <Route path="/alerts" element={<PrivateRoute><AlertsPage /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  )
}
