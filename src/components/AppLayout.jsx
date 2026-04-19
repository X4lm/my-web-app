import Sidebar from './Sidebar'
import Header from './Header'
import InvitationChecker from './InvitationChecker'
import AnalyticsTracker from './AnalyticsTracker'
import KeyboardShortcutsDialog from './KeyboardShortcutsDialog'
import AdvisorChat from './AdvisorChat'

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:ps-60">
        <Header />
        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
      <InvitationChecker />
      <AnalyticsTracker />
      <KeyboardShortcutsDialog />
      <AdvisorChat />
    </div>
  )
}
