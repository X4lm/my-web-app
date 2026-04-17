import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const LandingPage = lazy(() => import('@/pages/LandingPage'))
const Login = lazy(() => import('@/pages/Login'))
const Signup = lazy(() => import('@/pages/Signup'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Properties = lazy(() => import('@/pages/Properties'))
const PropertyDetail = lazy(() => import('@/pages/PropertyDetail'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const AlertsPage = lazy(() => import('@/pages/AlertsPage'))
const LogsPage = lazy(() => import('@/pages/LogsPage'))
const TeamsPage = lazy(() => import('@/pages/TeamsPage'))
const TenantsPage = lazy(() => import('@/pages/TenantsPage'))
const MessagesPage = lazy(() => import('@/pages/MessagesPage'))
const ChequeCalendarPage = lazy(() => import('@/pages/ChequeCalendarPage'))
const PortfolioPage = lazy(() => import('@/pages/PortfolioPage'))
const PriorityPage = lazy(() => import('@/pages/PriorityPage'))
const DocumentsExpiryPage = lazy(() => import('@/pages/DocumentsExpiryPage'))
const AtlasPage = lazy(() => import('@/pages/AtlasPage'))
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'))
const AdminUsersPage = lazy(() => import('@/pages/AdminUsersPage'))
const AdminAnalyticsPage = lazy(() => import('@/pages/AdminAnalyticsPage'))
const AdminSettingsPage = lazy(() => import('@/pages/AdminSettingsPage'))
const AdminSupportChatPage = lazy(() => import('@/pages/AdminSupportChatPage'))
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'))

function PrivateRoute({ children }) {
  const { currentUser } = useAuth()
  return currentUser ? children : <Navigate to="/login" />
}

function AdminRoute({ children }) {
  const { currentUser, userProfile } = useAuth()
  if (!currentUser) return <Navigate to="/login" />
  if (userProfile?.role !== 'admin') return <Navigate to="/dashboard" />
  return children
}

function PublicRoute({ children }) {
  const { currentUser } = useAuth()
  return !currentUser ? children : <Navigate to="/dashboard" />
}

function HomeRoute() {
  const { currentUser } = useAuth()
  return currentUser ? <Dashboard /> : <LandingPage />
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
        <Route path="/" element={<HomeRoute />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/properties" element={<PrivateRoute><Properties /></PrivateRoute>} />
        <Route path="/properties/:id" element={<PrivateRoute><PropertyDetail /></PrivateRoute>} />
        <Route path="/alerts" element={<PrivateRoute><AlertsPage /></PrivateRoute>} />
        <Route path="/logs" element={<PrivateRoute><LogsPage /></PrivateRoute>} />
        <Route path="/team" element={<PrivateRoute><TeamsPage /></PrivateRoute>} />
        <Route path="/tenants" element={<PrivateRoute><TenantsPage /></PrivateRoute>} />
        <Route path="/templates" element={<PrivateRoute><MessagesPage /></PrivateRoute>} />
        <Route path="/cheques" element={<PrivateRoute><ChequeCalendarPage /></PrivateRoute>} />
        <Route path="/portfolio" element={<PrivateRoute><PortfolioPage /></PrivateRoute>} />
        <Route path="/today" element={<PrivateRoute><PriorityPage /></PrivateRoute>} />
        <Route path="/documents" element={<PrivateRoute><DocumentsExpiryPage /></PrivateRoute>} />
        <Route path="/atlas" element={<PrivateRoute><AtlasPage /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
        <Route path="/admin/analytics" element={<AdminRoute><AdminAnalyticsPage /></AdminRoute>} />
        <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />
        <Route path="/admin/support-chat" element={<AdminRoute><AdminSupportChatPage /></AdminRoute>} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  )
}
