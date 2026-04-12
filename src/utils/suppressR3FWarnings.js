/**
 * Suppress known harmless "Invalid hook call" warnings from @react-three/fiber v8.
 *
 * The its-fine library (used by R3F) probes React internals at import time,
 * which triggers dev-only "Invalid hook call" warnings and "The above error
 * occurred in..." follow-up messages. These are cosmetic — the app works fine.
 *
 * This file MUST be imported before React to intercept console.error early.
 * Fixed in @react-three/fiber v9 + React 19 — remove this file after upgrading.
 */
if (import.meta.env.DEV) {
  const orig = console.error
  console.error = function (...args) {
    const msg = typeof args[0] === 'string' ? args[0] : ''
    if (msg.includes('Invalid hook call')) return
    if (msg.includes('The above error occurred')) return
    return orig.apply(console, args)
  }
}
