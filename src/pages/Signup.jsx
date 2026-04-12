import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Home } from 'lucide-react'
import { validatePassword } from '@/utils/validation'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const { t } = useLocale()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) return setError(t('auth.passwordsNoMatch'))
    const pwError = validatePassword(password)
    if (pwError) return setError(pwError)
    setLoading(true)
    try {
      await signup(email, password, name)
      navigate('/')
    } catch (err) {
      const safeErrors = {
        'auth/email-already-in-use': 'Unable to create account. Please try a different email or sign in.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Please choose a stronger password.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
      }
      setError(safeErrors[err.code] || 'An error occurred creating your account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-foreground">
            <Home className="w-4 h-4 text-background" />
          </div>
          <span className="text-lg font-semibold tracking-tight">{t('auth.propManager')}</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{t('auth.createAccount')}</CardTitle>
            <CardDescription>{t('auth.createAccountDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('auth.fullName')}</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('auth.fullNamePlaceholder')}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.minChars')}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">{t('auth.confirmPassword')}</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="consent"
                  required
                  className="mt-1 rounded border-input"
                />
                <Label htmlFor="consent" className="text-xs text-muted-foreground font-normal leading-relaxed">
                  I agree to the processing of my personal data as described in the{' '}
                  <Link to="/privacy" target="_blank" className="text-foreground underline underline-offset-2">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('auth.creatingAccount') : t('auth.createAccountBtn')}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {t('auth.hasAccount')}{' '}
              <Link to="/login" className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80">
                {t('auth.signIn')}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
