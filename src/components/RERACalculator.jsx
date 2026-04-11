import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/contexts/LocaleContext'
import { Calculator, Info } from 'lucide-react'

// RERA Rent Increase Calculator based on Dubai RERA rental index guidelines
// The allowed increase depends on how far the current rent is below the average market rent:
//  - 0-10% below market: No increase allowed
//  - 11-20% below market: Up to 5% increase
//  - 21-30% below market: Up to 10% increase
//  - 31-40% below market: Up to 15% increase
//  - 40%+ below market: Up to 20% increase

function calculateAllowedIncrease(currentRent, marketRent) {
  if (!currentRent || !marketRent || currentRent <= 0 || marketRent <= 0) return null

  const percentBelow = ((marketRent - currentRent) / marketRent) * 100

  let maxIncreasePercent = 0
  let bracket = ''

  if (percentBelow <= 10) {
    maxIncreasePercent = 0
    bracket = '0-10% below market'
  } else if (percentBelow <= 20) {
    maxIncreasePercent = 5
    bracket = '11-20% below market'
  } else if (percentBelow <= 30) {
    maxIncreasePercent = 10
    bracket = '21-30% below market'
  } else if (percentBelow <= 40) {
    maxIncreasePercent = 15
    bracket = '31-40% below market'
  } else {
    maxIncreasePercent = 20
    bracket = '40%+ below market'
  }

  const maxIncreaseAmount = currentRent * (maxIncreasePercent / 100)
  const newMaxRent = currentRent + maxIncreaseAmount

  return {
    percentBelow: Math.round(percentBelow * 10) / 10,
    maxIncreasePercent,
    maxIncreaseAmount: Math.round(maxIncreaseAmount),
    newMaxRent: Math.round(newMaxRent),
    bracket,
  }
}

export default function RERACalculator() {
  const { formatCurrency, getCurrencyCode } = useLocale()
  const [currentRent, setCurrentRent] = useState('')
  const [marketRent, setMarketRent] = useState('')
  const [result, setResult] = useState(null)

  function handleCalculate(e) {
    e.preventDefault()
    const res = calculateAllowedIncrease(Number(currentRent), Number(marketRent))
    setResult(res)
  }

  function handleReset() {
    setCurrentRent('')
    setMarketRent('')
    setResult(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="w-4 h-4" /> RERA Rent Increase Calculator
        </CardTitle>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          <Info className="w-3 h-3" />
          Based on Dubai RERA rental index guidelines for allowed annual rent increases.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCalculate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current annual rent ({getCurrencyCode()})</Label>
              <Input
                type="number"
                min="0"
                value={currentRent}
                onChange={e => { setCurrentRent(e.target.value); setResult(null) }}
                placeholder="e.g. 80000"
              />
            </div>
            <div className="space-y-2">
              <Label>Average market rent ({getCurrencyCode()})</Label>
              <Input
                type="number"
                min="0"
                value={marketRent}
                onChange={e => { setMarketRent(e.target.value); setResult(null) }}
                placeholder="e.g. 100000"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!currentRent || !marketRent}>
              <Calculator className="w-4 h-4" /> Calculate
            </Button>
            {result && (
              <Button type="button" variant="outline" size="sm" onClick={handleReset}>
                Reset
              </Button>
            )}
          </div>
        </form>

        {result && (
          <div className="mt-4 rounded-md border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current rent is</span>
              <Badge variant={result.maxIncreasePercent === 0 ? 'success' : 'warning'}>
                {result.percentBelow}% below market
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">RERA bracket</span>
              <span className="text-sm font-medium">{result.bracket}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Max allowed increase</span>
              <span className="text-sm font-semibold">
                {result.maxIncreasePercent === 0
                  ? 'No increase allowed'
                  : `${result.maxIncreasePercent}% (${formatCurrency(result.maxIncreaseAmount)})`
                }
              </span>
            </div>
            {result.maxIncreasePercent > 0 && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm font-medium">New maximum rent</span>
                <span className="text-lg font-semibold">{formatCurrency(result.newMaxRent)}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
