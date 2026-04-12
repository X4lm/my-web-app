import { useState, useEffect } from 'react'
import { logError } from '@/utils/logger'
import { useLocale } from '@/contexts/LocaleContext'
import { CloudSun, CloudRain, Cloud, Sun, Snowflake, CloudLightning, Wind, Loader2 } from 'lucide-react'

const WEATHER_ICONS = {
  Clear: Sun,
  Clouds: Cloud,
  Rain: CloudRain,
  Drizzle: CloudRain,
  Thunderstorm: CloudLightning,
  Snow: Snowflake,
  Mist: Wind,
  Haze: Wind,
  Fog: Wind,
}

export default function WeatherWidget() {
  const { settings } = useLocale()
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)

  // Resolve the effective unit: auto falls back to browser locale
  const useFahrenheit = settings.temperatureUnit === 'fahrenheit'
    || (settings.temperatureUnit !== 'celsius' && settings.temperatureUnit !== 'fahrenheit'
        && navigator.language?.startsWith('en-US'))

  useEffect(() => {
    async function fetchWeather(lat, lon) {
      try {
        const tempUnit = useFahrenheit ? '&temperature_unit=fahrenheit' : ''
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto${tempUnit}`
        )
        const data = await res.json()
        const temp = Math.round(data.current.temperature_2m)
        const code = data.current.weather_code
        const condition = getConditionFromCode(code)
        setWeather({ temp, condition, unit: useFahrenheit ? '\u00B0F' : '\u00B0C' })
      } catch (err) {
        logError('[Weather] Fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    setLoading(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => {
          // Default to New York if denied
          fetchWeather(40.7128, -74.006)
        }
      )
    } else {
      fetchWeather(40.7128, -74.006)
    }
  }, [useFahrenheit])

  function getConditionFromCode(code) {
    if (code === 0 || code === 1) return 'Clear'
    if (code >= 2 && code <= 3) return 'Clouds'
    if (code >= 45 && code <= 48) return 'Mist'
    if (code >= 51 && code <= 67) return 'Rain'
    if (code >= 71 && code <= 77) return 'Snow'
    if (code >= 80 && code <= 82) return 'Rain'
    if (code >= 85 && code <= 86) return 'Snow'
    if (code >= 95 && code <= 99) return 'Thunderstorm'
    return 'Clouds'
  }

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </div>
    )
  }

  if (!weather) return null

  const Icon = WEATHER_ICONS[weather.condition] || CloudSun

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="h-4 w-4" />
      <span className="font-medium">{weather.temp}{weather.unit}</span>
    </div>
  )
}
