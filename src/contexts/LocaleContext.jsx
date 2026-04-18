import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { logError } from '@/utils/logger'
import { useAuth } from '@/contexts/AuthContext'
import translations from '@/lib/translations'

const LocaleContext = createContext()

export function useLocale() {
  return useContext(LocaleContext)
}

const LANGUAGES = {
  en: { label: 'English', dir: 'ltr' },
  ar: { label: 'العربية', dir: 'rtl' },
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

const CALENDAR_SYSTEMS = {
  gregorian: { label: 'Gregorian', labelAr: 'ميلادي' },
  hijri: { label: 'Hijri (Islamic)', labelAr: 'هجري' },
  both: { label: 'Both (Gregorian + Hijri)', labelAr: 'كلاهما' },
}

// Static exchange rates (base: USD) — updated manually or via API
const EXCHANGE_RATES = {
  USD: 1,
  AED: 3.6725,
  EUR: 0.92,
  GBP: 0.79,
  SAR: 3.75,
  QAR: 3.64,
  BHD: 0.376,
  KWD: 0.307,
  OMR: 0.385,
  INR: 83.5,
  PKR: 278.5,
  EGP: 48.5,
}

const TEMPERATURE_UNITS = {
  auto: { label: 'Auto' },
  celsius: { label: '\u00B0C' },
  fahrenheit: { label: '\u00B0F' },
}

// UAE-first app — default to AED / DD/MM/YYYY (common in the Gulf).
// Users in other regions can change in Settings; Firestore per-user settings
// override these defaults once loaded.
const DEFAULTS = {
  currency: 'AED',
  dateFormat: 'DD/MM/YYYY',
  financialYearStart: '1', // January
  language: 'en',
  calendar: 'gregorian',
  secondaryCurrency: '',
  temperatureUnit: 'auto', // 'auto' | 'celsius' | 'fahrenheit'
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
        logError('[Locale] Load error:', err)
      } finally {
        setLoaded(true)
      }
    }
    load()
  }, [currentUser])

  // Apply language direction to <html>
  useEffect(() => {
    const lang = settings.language || 'en'
    const dir = LANGUAGES[lang]?.dir || 'ltr'
    document.documentElement.setAttribute('lang', lang)
    document.documentElement.setAttribute('dir', dir)
  }, [settings.language])

  const t = useCallback((key, tokens) => {
    const lang = settings.language || 'en'
    let str = translations[lang]?.[key] || translations.en?.[key] || key
    if (tokens && typeof str === 'string') {
      for (const [k, v] of Object.entries(tokens)) {
        str = str.replaceAll(`{${k}}`, String(v))
      }
    }
    return str
  }, [settings.language])

  // Translated pluralization: given a count, a singular key, and a plural key,
  // returns a string like "1 unit" / "5 units" using the translations.
  // Usage: tPlural(count, 'unit.singular', 'unit.plural') returns "{n} unit" etc.
  const tPlural = useCallback((count, singularKey, pluralKey) => {
    const n = Number(count)
    const key = n === 1 ? singularKey : pluralKey
    return t(key, { n })
  }, [t])

  const isRTL = (LANGUAGES[settings.language]?.dir || 'ltr') === 'rtl'

  async function updateSettings(newSettings) {
    const merged = { ...settings, ...newSettings }
    setSettings(merged)
    localStorage.setItem('localeSettings', JSON.stringify(merged))
    if (currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid, 'settings', 'locale'), merged)
      } catch (err) {
        logError('[Locale] Save error:', err)
      }
    }
  }

  function formatCurrency(amount) {
    const num = Number(amount || 0)
    const curr = CURRENCIES[settings.currency] || CURRENCIES.USD
    const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    return `${curr.symbol} ${formatted}`
  }

  function convertCurrency(amount, fromCurrency, toCurrency) {
    const num = Number(amount || 0)
    const fromRate = EXCHANGE_RATES[fromCurrency] || 1
    const toRate = EXCHANGE_RATES[toCurrency] || 1
    return num / fromRate * toRate
  }

  function formatWithConversion(amount) {
    const primary = formatCurrency(amount)
    const sec = settings.secondaryCurrency
    if (!sec || sec === settings.currency) return primary
    const converted = convertCurrency(amount, settings.currency, sec)
    const secCurr = CURRENCIES[sec] || CURRENCIES.USD
    const formatted = converted.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    return `${primary} (${secCurr.symbol} ${formatted})`
  }

  function formatHijriDate(date) {
    try {
      return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
        day: 'numeric', month: 'long', year: 'numeric',
      }).format(date)
    } catch {
      return ''
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '\u2014'
    const d = new Date(dateStr + 'T00:00:00')
    const fmt = DATE_FORMATS[settings.dateFormat] || DATE_FORMATS['MM/DD/YYYY']
    let gregorian
    if (settings.dateFormat === 'YYYY-MM-DD') {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      gregorian = `${y}-${m}-${day}`
    } else {
      gregorian = d.toLocaleDateString(fmt.locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    const cal = settings.calendar || 'gregorian'
    if (cal === 'hijri') return formatHijriDate(d)
    if (cal === 'both') {
      const hijri = formatHijriDate(d)
      return hijri ? `${gregorian} (${hijri})` : gregorian
    }
    return gregorian
  }

  function formatDateTime(ts) {
    if (!ts) return '\u2014'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    const fmt = DATE_FORMATS[settings.dateFormat] || DATE_FORMATS['MM/DD/YYYY']
    const gregorian = d.toLocaleDateString(fmt.locale, {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })

    const cal = settings.calendar || 'gregorian'
    if (cal === 'hijri') {
      try {
        return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
          day: 'numeric', month: 'long', year: 'numeric',
          hour: 'numeric', minute: '2-digit',
        }).format(d)
      } catch {
        return gregorian
      }
    }
    if (cal === 'both') {
      const hijri = formatHijriDate(d)
      return hijri ? `${gregorian} (${hijri})` : gregorian
    }
    return gregorian
  }

  // Relative-time formatter ("2 hours ago", "Yesterday", "Apr 18").
  // Uses Intl.RelativeTimeFormat for up-to-now values within a week, then
  // falls back to the fixed date. Locale-aware.
  function formatRelativeTime(value) {
    if (!value) return '\u2014'
    const d = value?.toDate ? value.toDate() : new Date(value)
    if (isNaN(d.getTime())) return '\u2014'
    const diffMs = d.getTime() - Date.now()
    const absSec = Math.abs(diffMs / 1000)
    const lang = settings.language === 'ar' ? 'ar' : 'en'
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
    if (absSec < 60) return rtf.format(Math.round(diffMs / 1000), 'second')
    if (absSec < 3600) return rtf.format(Math.round(diffMs / 60000), 'minute')
    if (absSec < 86400) return rtf.format(Math.round(diffMs / 3600000), 'hour')
    if (absSec < 604800) return rtf.format(Math.round(diffMs / 86400000), 'day')
    return formatDateTime(value)
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
      formatCurrency, formatDate, formatDateTime, formatRelativeTime,
      formatWithConversion, convertCurrency,
      getCurrencyCode, getCurrencyLabel,
      t, tPlural, isRTL,
      CURRENCIES, DATE_FORMATS, LANGUAGES,
      CALENDAR_SYSTEMS, EXCHANGE_RATES, TEMPERATURE_UNITS,
    }}>
      {children}
    </LocaleContext.Provider>
  )
}
