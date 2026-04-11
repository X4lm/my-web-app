import { createContext, useContext, useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'

const LocaleContext = createContext()

export function useLocale() {
  return useContext(LocaleContext)
}

const CURRENCIES = {
  AED: { symbol: 'AED', name: 'UAE Dirham', locale: 'en-AE' },
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  EUR: { symbol: '\u20AC', name: 'Euro', locale: 'en-DE' },
  GBP: { symbol: '\u00A3', name: 'British Pound', locale: 'en-GB' },
  SAR: { symbol: 'SAR', name: 'Saudi Riyal', locale: 'en-SA' },
  QAR: { symbol: 'QAR', name: 'Qatari Riyal', locale: 'en-QA' },
  BHD: { symbol: 'BHD', name: 'Bahraini Dinar', locale: 'en-BH' },
  KWD: { symbol: 'KWD', name: 'Kuwaiti Dinar', locale: 'en-KW' },
  OMR: { symbol: 'OMR', name: 'Omani Rial', locale: 'en-OM' },
  INR: { symbol: '\u20B9', name: 'Indian Rupee', locale: 'en-IN' },
  PKR: { symbol: 'PKR', name: 'Pakistani Rupee', locale: 'en-PK' },
  EGP: { symbol: 'EGP', name: 'Egyptian Pound', locale: 'en-EG' },
}

const DATE_FORMATS = {
  'DD/MM/YYYY': { label: 'DD/MM/YYYY (15/03/2025)', locale: 'en-GB' },
  'MM/DD/YYYY': { label: 'MM/DD/YYYY (03/15/2025)', locale: 'en-US' },
  'YYYY-MM-DD': { label: 'YYYY-MM-DD (2025-03-15)', locale: 'en-CA' },
}

const DEFAULTS = {
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY',
  financialYearStart: '1', // January
}

export function LocaleProvider({ children }) {
  const { currentUser } = useAuth()
  const [settings, setSettings] = useState(() => {
    const stored = localStorage.getItem('localeSettings')
    return stored ? JSON.parse(stored) : DEFAULTS
  })
  const [loaded, setLoaded] = useState(false)

  // Load from Firestore on login
  useEffect(() => {
    if (!currentUser) return
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid, 'settings', 'locale'))
        if (snap.exists()) {
          const data = snap.data()
          setSettings(prev => ({ ...prev, ...data }))
          localStorage.setItem('localeSettings', JSON.stringify({ ...DEFAULTS, ...data }))
        }
      } catch (err) {
        console.error('[Locale] Load error:', err)
      } finally {
        setLoaded(true)
      }
    }
    load()
  }, [currentUser])

  async function updateSettings(newSettings) {
    const merged = { ...settings, ...newSettings }
    setSettings(merged)
    localStorage.setItem('localeSettings', JSON.stringify(merged))
    if (currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid, 'settings', 'locale'), merged)
      } catch (err) {
        console.error('[Locale] Save error:', err)
      }
    }
  }

  function formatCurrency(amount) {
    const num = Number(amount || 0)
    const curr = CURRENCIES[settings.currency] || CURRENCIES.USD
    const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    return `${curr.symbol} ${formatted}`
  }

  function formatDate(dateStr) {
    if (!dateStr) return '\u2014'
    const d = new Date(dateStr + 'T00:00:00')
    const fmt = DATE_FORMATS[settings.dateFormat] || DATE_FORMATS['MM/DD/YYYY']
    if (settings.dateFormat === 'YYYY-MM-DD') {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
    return d.toLocaleDateString(fmt.locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function formatDateTime(ts) {
    if (!ts) return '\u2014'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    const fmt = DATE_FORMATS[settings.dateFormat] || DATE_FORMATS['MM/DD/YYYY']
    return d.toLocaleDateString(fmt.locale, {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
  }

  function getCurrencyCode() {
    return settings.currency
  }

  function getCurrencyLabel() {
    return CURRENCIES[settings.currency]?.name || settings.currency
  }

  return (
    <LocaleContext.Provider value={{
      settings, updateSettings,
      formatCurrency, formatDate, formatDateTime,
      getCurrencyCode, getCurrencyLabel,
      CURRENCIES, DATE_FORMATS,
    }}>
      {children}
    </LocaleContext.Provider>
  )
}
