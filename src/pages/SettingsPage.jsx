import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { updateProfile, sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/firebase/config'

export default function SettingsPage() {
  const { currentUser } = useAuth()
  const [name, setName] = useState(currentUser?.displayName || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetSending, setResetSending] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await updateProfile(auth.currentUser, { displayName: name })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('[Settings] Update failed:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your account preferences.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
            <CardDescription>Update your personal information.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display-name">Display name</Label>
                <Input
                  id="display-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={currentUser?.email || ''} disabled />
                <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </Button>
                {saved && <span className="text-sm text-emerald-600">Saved!</span>}
              </div>
            </form>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>Manage your account settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Account ID</p>
                <p className="text-xs text-muted-foreground font-mono">{currentUser?.uid}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Password</p>
                <p className="text-xs text-muted-foreground">Send a password reset link to your email.</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={resetSending}
                  onClick={async () => {
                    setResetSending(true)
                    setResetSent(false)
                    try {
                      await sendPasswordResetEmail(auth, currentUser.email)
                      setResetSent(true)
                      setTimeout(() => setResetSent(false), 5000)
                    } catch (err) {
                      console.error('[Settings] Password reset error:', err)
                    } finally {
                      setResetSending(false)
                    }
                  }}
                >
                  {resetSending ? 'Sending...' : 'Reset Password'}
                </Button>
                {resetSent && <span className="text-sm text-emerald-600">Email sent!</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
