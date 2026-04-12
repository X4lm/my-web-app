import { useState } from 'react'
import { multiFactor, TotpMultiFactorGenerator } from 'firebase/auth'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function MFASetup() {
  const { currentUser } = useAuth()
  const [totpSecret, setTotpSecret] = useState(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleEnroll() {
    try {
      const session = await multiFactor(currentUser).getSession()
      const secret = await TotpMultiFactorGenerator.generateSecret(session)
      setTotpSecret(secret)
    } catch (err) {
      setError('Failed to start MFA enrollment. Ensure Identity Platform is enabled.')
    }
  }

  async function handleVerify() {
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, verificationCode)
      await multiFactor(currentUser).enroll(assertion, 'Authenticator App')
      setSuccess(true)
    } catch (err) {
      setError('Invalid verification code. Please try again.')
    }
  }

  if (success) {
    return <Card><CardContent className="p-6">MFA enabled successfully.</CardContent></Card>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-Factor Authentication</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}
        {!totpSecret ? (
          <Button onClick={handleEnroll}>Enable 2FA</Button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm">Scan this QR code with your authenticator app, then enter the verification code.</p>
            <img src={totpSecret.generateQrCodeUrl(currentUser.email, 'PropVault')} alt="QR Code" className="w-48 h-48" />
            <Input
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              maxLength={6}
            />
            <Button onClick={handleVerify}>Verify & Enable</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
