import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'

/* ─── CONSTANTS ─── */
const GOLD = '#D4A853'
const GOLD_LIGHT = '#E8C97A'
const NAVY = '#0B1120'
const NAVY_LIGHT = '#111827'
const NAVY_CARD = '#151E2F'

/* ─── ANIMATION VARIANTS ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: i * 0.12, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8 } },
}
const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: (i = 0) => ({
    opacity: 1, scale: 1,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}
const slideInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] } },
}
const slideInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] } },
}

/* ─── SCROLL-TRIGGERED SECTION WRAPPER ─── */
function Section({ children, className = '', id }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <section id={id} ref={ref} className={className}>
      <motion.div
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={fadeIn}
      >
        {children}
      </motion.div>
    </section>
  )
}

/* ─── ANIMATED COUNTER ─── */
function Counter({ end, suffix = '', duration = 2 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isInView) return
    let start = 0
    const step = end / (duration * 60)
    const timer = setInterval(() => {
      start += step
      if (start >= end) { setCount(end); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 1000 / 60)
    return () => clearInterval(timer)
  }, [isInView, end, duration])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

/* ─── SVG ICONS ─── */
function BuildingIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="1" />
      <line x1="9" y1="6" x2="9" y2="6.01" /><line x1="15" y1="6" x2="15" y2="6.01" />
      <line x1="9" y1="10" x2="9" y2="10.01" /><line x1="15" y1="10" x2="15" y2="10.01" />
      <line x1="9" y1="14" x2="9" y2="14.01" /><line x1="15" y1="14" x2="15" y2="14.01" />
      <path d="M10 22v-4h4v4" />
    </svg>
  )
}

function ShieldCheckIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function AlertIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function ChartIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function UsersIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

function CubeIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

function LayoutIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  )
}

function WrenchIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

function DropletIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
    </svg>
  )
}

function ThermometerIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" />
    </svg>
  )
}

function ArrowUpIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M12 14V8" /><path d="M9 11l3-3 3 3" />
    </svg>
  )
}

function FlameIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
    </svg>
  )
}

function ZapIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function LockIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  )
}

function DatabaseIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  )
}

function GlobeIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  )
}

function VillaIcon({ className = 'w-12 h-12' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 32L32 12L56 32" /><rect x="14" y="32" width="36" height="22" rx="1" />
      <rect x="24" y="40" width="8" height="14" rx="0.5" /><rect x="38" y="36" width="6" height="6" rx="0.5" />
      <rect x="20" y="36" width="6" height="6" rx="0.5" /><line x1="32" y1="6" x2="32" y2="12" />
      <rect x="30" y="4" width="4" height="6" />
    </svg>
  )
}

function TownhouseIcon({ className = 'w-12 h-12' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="22" width="18" height="32" rx="1" /><path d="M6 22L15 12L24 22" />
      <rect x="10" y="28" width="5" height="5" rx="0.5" /><rect x="10" y="38" width="5" height="5" rx="0.5" />
      <rect x="13" y="46" width="5" height="8" rx="0.5" />
      <rect x="24" y="18" width="18" height="36" rx="1" /><path d="M24 18L33 8L42 18" />
      <rect x="28" y="24" width="5" height="5" rx="0.5" /><rect x="28" y="34" width="5" height="5" rx="0.5" />
      <rect x="31" y="44" width="5" height="10" rx="0.5" />
      <rect x="42" y="22" width="18" height="32" rx="1" /><path d="M42 22L51 12L60 22" />
      <rect x="46" y="28" width="5" height="5" rx="0.5" /><rect x="46" y="38" width="5" height="5" rx="0.5" />
      <rect x="49" y="46" width="5" height="8" rx="0.5" />
    </svg>
  )
}

function ApartmentIcon({ className = 'w-12 h-12' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="16" y="8" width="32" height="48" rx="1" />
      <rect x="22" y="14" width="6" height="5" rx="0.5" /><rect x="36" y="14" width="6" height="5" rx="0.5" />
      <rect x="22" y="24" width="6" height="5" rx="0.5" /><rect x="36" y="24" width="6" height="5" rx="0.5" />
      <rect x="22" y="34" width="6" height="5" rx="0.5" /><rect x="36" y="34" width="6" height="5" rx="0.5" />
      <rect x="28" y="46" width="8" height="10" rx="0.5" />
    </svg>
  )
}

function ResidentialIcon({ className = 'w-12 h-12' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="10" y="14" width="20" height="42" rx="1" /><rect x="34" y="6" width="22" height="50" rx="1" />
      <rect x="14" y="20" width="5" height="4" rx="0.5" /><rect x="21" y="20" width="5" height="4" rx="0.5" />
      <rect x="14" y="28" width="5" height="4" rx="0.5" /><rect x="21" y="28" width="5" height="4" rx="0.5" />
      <rect x="14" y="36" width="5" height="4" rx="0.5" /><rect x="21" y="36" width="5" height="4" rx="0.5" />
      <rect x="17" y="46" width="6" height="10" rx="0.5" />
      <rect x="38" y="12" width="5" height="4" rx="0.5" /><rect x="47" y="12" width="5" height="4" rx="0.5" />
      <rect x="38" y="20" width="5" height="4" rx="0.5" /><rect x="47" y="20" width="5" height="4" rx="0.5" />
      <rect x="38" y="28" width="5" height="4" rx="0.5" /><rect x="47" y="28" width="5" height="4" rx="0.5" />
      <rect x="38" y="36" width="5" height="4" rx="0.5" /><rect x="47" y="36" width="5" height="4" rx="0.5" />
      <rect x="42" y="46" width="6" height="10" rx="0.5" />
    </svg>
  )
}

/* ─── HERO BUILDING SVG ─── */
function HeroBuilding() {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      <svg viewBox="0 0 500 400" fill="none" className="w-full h-auto">
        {/* Background glow */}
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.15" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="buildingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id="buildingGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0B1120" />
          </linearGradient>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={GOLD} />
            <stop offset="100%" stopColor={GOLD_LIGHT} />
          </linearGradient>
        </defs>

        <ellipse cx="250" cy="350" rx="220" ry="30" fill="url(#glow)" />

        {/* Main tall building */}
        <motion.g
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
        >
          <rect x="180" y="60" width="140" height="290" rx="3" fill="url(#buildingGrad)" stroke="#1E293B" strokeWidth="1" />
          {/* Windows */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(row =>
            [0, 1, 2, 3].map(col => (
              <motion.rect
                key={`w-${row}-${col}`}
                x={195 + col * 30}
                y={80 + row * 28}
                width="14"
                height="12"
                rx="1"
                fill={GOLD}
                opacity={0.15 + Math.random() * 0.55}
                animate={{ opacity: [0.15 + Math.random() * 0.4, 0.3 + Math.random() * 0.5, 0.15 + Math.random() * 0.4] }}
                transition={{ duration: 3 + Math.random() * 4, repeat: Infinity, ease: 'easeInOut' }}
              />
            ))
          )}
          {/* Door */}
          <rect x="232" y="320" width="36" height="30" rx="2" fill="#0B1120" stroke={GOLD} strokeWidth="0.5" opacity="0.6" />
          {/* Roof accent */}
          <rect x="180" y="57" width="140" height="4" rx="2" fill="url(#goldGrad)" opacity="0.7" />
        </motion.g>

        {/* Left building */}
        <motion.g
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
        >
          <rect x="80" y="140" width="100" height="210" rx="3" fill="url(#buildingGrad2)" stroke="#1E293B" strokeWidth="1" />
          {[0, 1, 2, 3, 4, 5, 6].map(row =>
            [0, 1, 2].map(col => (
              <motion.rect
                key={`wl-${row}-${col}`}
                x={93 + col * 28}
                y={158 + row * 26}
                width="12"
                height="10"
                rx="1"
                fill={GOLD}
                opacity={0.1 + Math.random() * 0.5}
                animate={{ opacity: [0.1 + Math.random() * 0.3, 0.3 + Math.random() * 0.45, 0.1 + Math.random() * 0.3] }}
                transition={{ duration: 4 + Math.random() * 3, repeat: Infinity, ease: 'easeInOut' }}
              />
            ))
          )}
          <rect x="80" y="137" width="100" height="4" rx="2" fill="url(#goldGrad)" opacity="0.5" />
        </motion.g>

        {/* Right building */}
        <motion.g
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.7, ease: 'easeOut' }}
        >
          <rect x="320" y="110" width="110" height="240" rx="3" fill="url(#buildingGrad2)" stroke="#1E293B" strokeWidth="1" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map(row =>
            [0, 1, 2].map(col => (
              <motion.rect
                key={`wr-${row}-${col}`}
                x={335 + col * 30}
                y={128 + row * 26}
                width="14"
                height="10"
                rx="1"
                fill={GOLD}
                opacity={0.1 + Math.random() * 0.5}
                animate={{ opacity: [0.15 + Math.random() * 0.35, 0.3 + Math.random() * 0.5, 0.15 + Math.random() * 0.35] }}
                transition={{ duration: 3 + Math.random() * 4, repeat: Infinity, ease: 'easeInOut' }}
              />
            ))
          )}
          <rect x="320" y="107" width="110" height="4" rx="2" fill="url(#goldGrad)" opacity="0.5" />
        </motion.g>

        {/* Ground line */}
        <line x1="50" y1="350" x2="450" y2="350" stroke="#1E293B" strokeWidth="1" />
      </svg>

      {/* Floating stat cards */}
      <motion.div
        className="absolute -left-4 top-8 sm:left-0 bg-white/[0.07] backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 shadow-2xl"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2, duration: 0.8 }}
      >
        <p className="text-[11px] text-white/50 font-medium uppercase tracking-wider">Units Managed</p>
        <p className="text-xl font-bold text-white mt-0.5"><Counter end={10000} suffix="+" /></p>
      </motion.div>

      <motion.div
        className="absolute -right-4 top-24 sm:right-0 bg-white/[0.07] backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 shadow-2xl"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.5, duration: 0.8 }}
      >
        <p className="text-[11px] text-white/50 font-medium uppercase tracking-wider">Alerts Caught</p>
        <p className="text-xl font-bold text-white mt-0.5"><Counter end={98} suffix="%" /></p>
      </motion.div>

      <motion.div
        className="absolute right-8 bottom-8 sm:right-12 bg-white/[0.07] backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 0.8 }}
      >
        <p className="text-[11px] text-white/50 font-medium uppercase tracking-wider">Admin Time Saved</p>
        <p className="text-xl font-bold text-white mt-0.5"><Counter end={40} suffix="%" /></p>
      </motion.div>
    </div>
  )
}

/* ─── GOLD BUTTON ─── */
function GoldButton({ children, onClick, size = 'default', className = '' }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03, boxShadow: `0 0 30px ${GOLD}40` }}
      whileTap={{ scale: 0.98 }}
      className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 font-semibold rounded-lg transition-all duration-300 ${
        size === 'lg' ? 'px-5 py-3 sm:px-8 sm:py-4 text-xs sm:text-base' : 'px-4 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm'
      } bg-gradient-to-r from-[#D4A853] to-[#E8C97A] text-[#0B1120] hover:from-[#E8C97A] hover:to-[#D4A853] shadow-lg shadow-[#D4A853]/20 ${className}`}
    >
      {children}
    </motion.button>
  )
}

function SecondaryButton({ children, onClick, className = '' }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 font-semibold rounded-lg px-4 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm border border-white/20 text-white/90 hover:bg-white/[0.06] hover:border-white/30 transition-all duration-300 ${className}`}
    >
      {children}
    </motion.button>
  )
}

/* ─── FEATURE CARD ─── */
function FeatureCard({ icon: Icon, title, description, index }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.div
      ref={ref}
      custom={index}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={scaleIn}
      whileHover={{ y: -6, transition: { duration: 0.3 } }}
      className="group relative bg-white/[0.04] backdrop-blur border border-white/[0.06] rounded-2xl p-6 hover:border-[#D4A853]/30 hover:bg-white/[0.06] transition-all duration-500"
    >
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D4A853]/20 to-[#D4A853]/5 flex items-center justify-center mb-4 group-hover:from-[#D4A853]/30 group-hover:to-[#D4A853]/10 transition-all duration-500">
        <Icon className="w-5 h-5 text-[#D4A853]" />
      </div>
      <h3 className="text-white font-semibold text-base mb-2">{title}</h3>
      <p className="text-white/50 text-sm leading-relaxed">{description}</p>
    </motion.div>
  )
}

/* ─── MAIN LANDING PAGE ─── */
export default function LandingPage() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function scrollTo(id) {
    setMobileMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const navLinks = [
    { label: 'Features', id: 'features' },
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'Security', id: 'security' },
    { label: 'Contact', id: 'footer' },
  ]

  return (
    <div className="min-h-screen bg-[#0B1120] text-white overflow-x-hidden" style={{ fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif' }}>

      {/* ════════ NAV ════════ */}
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-[#0B1120]/80 backdrop-blur-xl border-b border-white/[0.06] shadow-xl shadow-black/20'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4A853] to-[#E8C97A]">
                <BuildingIcon className="w-4.5 h-4.5 text-[#0B1120]" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">PropVault</span>
            </div>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map(link => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="text-sm text-white/60 hover:text-white font-medium transition-colors duration-300"
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* CTA */}
            <div className="hidden md:block">
              <GoldButton onClick={() => navigate('/signup')}>Get Started Free</GoldButton>
            </div>

            {/* Mobile burger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-white/70 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                {mobileMenuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#0B1120]/95 backdrop-blur-xl border-b border-white/[0.06] overflow-hidden"
            >
              <div className="px-6 py-4 space-y-3">
                {navLinks.map(link => (
                  <button
                    key={link.id}
                    onClick={() => scrollTo(link.id)}
                    className="block w-full text-left text-sm text-white/60 hover:text-white font-medium py-2"
                  >
                    {link.label}
                  </button>
                ))}
                <div className="pt-2">
                  <GoldButton onClick={() => navigate('/signup')} className="w-full">Get Started Free</GoldButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ════════ HERO ════════ */}
      <section className="relative lg:min-h-screen flex items-center pt-24 pb-8 sm:pt-28 sm:pb-12 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#D4A853]/[0.04] rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#D4A853]/[0.03] rounded-full blur-[100px]" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left copy */}
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4A853]/10 border border-[#D4A853]/20 mb-6"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-pulse" />
                <span className="text-[#D4A853] text-xs font-semibold uppercase tracking-wider">Smart Property Management</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-3xl sm:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.1] tracking-tight"
              >
                Every property.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4A853] to-[#E8C97A]">
                  Every detail.
                </span>{' '}
                Always in control.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="mt-5 text-base sm:text-lg text-white/50 leading-relaxed max-w-xl mx-auto lg:mx-0"
              >
                The only platform built for serious property owners in the UAE. Track every unit, every maintenance record, every dirham — all in one place.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.6 }}
                className="mt-8 flex flex-row gap-3 sm:gap-4 justify-center lg:justify-start"
              >
                <GoldButton onClick={() => navigate('/signup')} size="lg">
                  Get Started Free
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                  </svg>
                </GoldButton>
                <SecondaryButton onClick={() => scrollTo('how-it-works')}>
                  See How It Works
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14" /><path d="M19 12l-7 7-7-7" />
                  </svg>
                </SecondaryButton>
              </motion.div>
            </div>

            {/* Right visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="hidden lg:block"
            >
              <HeroBuilding />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════════ PROBLEM ════════ */}
      <Section id="problem" className="py-16 sm:py-24 lg:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div className="text-center mb-16" variants={fadeUp} custom={0}>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Still managing properties with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                spreadsheets and WhatsApp?
              </span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: AlertIcon,
                title: 'Missed Deadlines',
                desc: 'Missed maintenance deadlines costing thousands in emergency repairs and tenant complaints.',
                color: 'from-red-500/20 to-red-500/5',
              },
              {
                icon: ChartIcon,
                title: 'Zero Visibility',
                desc: 'No visibility into which units are occupied, overdue, or need urgent attention.',
                color: 'from-orange-500/20 to-orange-500/5',
              },
              {
                icon: UsersIcon,
                title: 'Scattered Data',
                desc: 'Tenant data scattered across your phone, email, WhatsApp, and stacks of paper.',
                color: 'from-amber-500/20 to-amber-500/5',
              },
            ].map((item, i) => {
              const ref = useRef(null)
              const isInView = useInView(ref, { once: true, margin: '-40px' })
              return (
                <motion.div
                  ref={ref}
                  key={i}
                  custom={i}
                  initial="hidden"
                  animate={isInView ? 'visible' : 'hidden'}
                  variants={fadeUp}
                  className="relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-center"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-4`}>
                    <item.icon className="w-6 h-6 text-white/70" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{item.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </Section>

      {/* ════════ SOLUTION / FEATURES ════════ */}
      <Section id="features" className="py-16 sm:py-24 lg:py-32 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-[#D4A853]/[0.03] rounded-full blur-[150px] -translate-y-1/2" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div className="text-center mb-16" variants={fadeUp}>
            <p className="text-[#D4A853] text-sm font-semibold uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              One platform. <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4A853] to-[#E8C97A]">Total visibility.</span>
            </h2>
            <p className="mt-4 text-white/45 max-w-2xl mx-auto">Everything you need to manage your property portfolio with confidence.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard index={0} icon={LayoutIcon} title="Smart Property Dashboard" description="See your entire portfolio at a glance — occupancy, revenue, alerts, and more in real-time." />
            <FeatureCard index={1} icon={WrenchIcon} title="Granular Maintenance Tracking" description="Water tanks, AC units, elevators, fire safety — track every system with smart scheduling." />
            <FeatureCard index={2} icon={UsersIcon} title="Unit Management" description="Track every tenant, lease agreement, payment status, and Ejari registration in one place." />
            <FeatureCard index={3} icon={ChartIcon} title="Financial Overview" description="Income vs expenses, occupancy rates, rent collection, and VAT tracking for commercial properties." />
            <FeatureCard index={4} icon={CubeIcon} title="3D Building Viewer" description="Visualize which units are occupied, vacant, or have alerts with an interactive 3D model." />
            <FeatureCard index={5} icon={AlertIcon} title="Intelligent Alert System" description="Never miss a maintenance deadline, lease expiry, or document renewal date again." />
          </div>
        </div>
      </Section>

      {/* ════════ HOW IT WORKS ════════ */}
      <Section id="how-it-works" className="py-16 sm:py-24 lg:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.015] to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div className="text-center mb-16" variants={fadeUp}>
            <p className="text-[#D4A853] text-sm font-semibold uppercase tracking-wider mb-3">How It Works</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Up and running in minutes</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {[
              { step: 1, title: 'Add your properties', desc: 'Villas, apartments, buildings, townhouses — add them all in seconds.', icon: BuildingIcon },
              { step: 2, title: 'Set up units & schedules', desc: 'Configure your units, tenants, and maintenance schedules with guided setup.', icon: WrenchIcon },
              { step: 3, title: 'Get real-time visibility', desc: 'Instant alerts, live dashboard, and full portfolio oversight from day one.', icon: ZapIcon },
            ].map((item, i) => {
              const ref = useRef(null)
              const isInView = useInView(ref, { once: true, margin: '-40px' })
              return (
                <motion.div
                  ref={ref}
                  key={i}
                  custom={i}
                  initial="hidden"
                  animate={isInView ? 'visible' : 'hidden'}
                  variants={fadeUp}
                  className="text-center relative"
                >
                  <div className="relative mx-auto mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4A853]/20 to-[#D4A853]/5 border border-[#D4A853]/20 flex items-center justify-center mx-auto">
                      <item.icon className="w-7 h-7 text-[#D4A853]" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#D4A853] flex items-center justify-center">
                      <span className="text-xs font-bold text-[#0B1120]">{item.step}</span>
                    </div>
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{item.desc}</p>
                  {i < 2 && (
                    <div className="hidden md:block absolute top-8 -right-6 lg:-right-8 text-white/10">
                      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </Section>

      {/* ════════ PROPERTY TYPES ════════ */}
      <Section className="py-16 sm:py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-16" variants={fadeUp}>
            <p className="text-[#D4A853] text-sm font-semibold uppercase tracking-wider mb-3">Property Types</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Built for every property type</h2>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: ResidentialIcon, label: 'Residential Buildings' },
              { icon: VillaIcon, label: 'Villas' },
              { icon: TownhouseIcon, label: 'Townhouses' },
              { icon: ApartmentIcon, label: 'Apartments' },
            ].map((item, i) => {
              const ref = useRef(null)
              const isInView = useInView(ref, { once: true, margin: '-40px' })
              return (
                <motion.div
                  ref={ref}
                  key={i}
                  custom={i}
                  initial="hidden"
                  animate={isInView ? 'visible' : 'hidden'}
                  variants={scaleIn}
                  whileHover={{ y: -6 }}
                  className="group bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 text-center hover:border-[#D4A853]/30 hover:bg-white/[0.05] transition-all duration-500 cursor-default"
                >
                  <div className="text-[#D4A853]/70 group-hover:text-[#D4A853] transition-colors duration-500 flex justify-center mb-4">
                    <item.icon />
                  </div>
                  <h3 className="text-white font-semibold text-sm">{item.label}</h3>
                </motion.div>
              )
            })}
          </div>
        </div>
      </Section>

      {/* ════════ MAINTENANCE SHOWCASE ════════ */}
      <Section className="py-16 sm:py-24 lg:py-32 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-[#D4A853]/[0.025] rounded-full blur-[150px] -translate-y-1/2" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <motion.div variants={slideInLeft}>
              <p className="text-[#D4A853] text-sm font-semibold uppercase tracking-wider mb-3">Maintenance Tracking</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
                Granular tracking for every system in your property
              </h2>
              <p className="text-white/45 leading-relaxed mb-8">
                From water tanks to fire safety systems — track every maintenance schedule, service history, and upcoming deadline across your entire portfolio.
              </p>

              {/* Alert examples */}
              <div className="flex flex-wrap gap-3">
                <motion.span
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 text-xs font-semibold"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Overdue: Water Tank Cleaning
                </motion.span>
                <motion.span
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs font-semibold"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Upcoming: AC Service in 5 days
                </motion.span>
              </div>
            </motion.div>

            <motion.div variants={slideInRight}>
              <div className="space-y-3">
                {[
                  { icon: DropletIcon, label: 'Water Tank', detail: 'Capacity, last cleaned, next due date', color: 'text-blue-400' },
                  { icon: ThermometerIcon, label: 'AC Units', detail: 'Per-unit service history & filter replacement', color: 'text-cyan-400' },
                  { icon: ArrowUpIcon, label: 'Elevators', detail: 'Certification & service scheduling', color: 'text-violet-400' },
                  { icon: FlameIcon, label: 'Fire Safety', detail: 'Extinguisher & suppression system checks', color: 'text-red-400' },
                  { icon: ZapIcon, label: 'Generator & Electrical', detail: 'Load testing, panel inspections', color: 'text-yellow-400' },
                  { icon: WrenchIcon, label: 'Plumbing, Roof, Pool & More', detail: 'Full lifecycle tracking for every system', color: 'text-emerald-400' },
                ].map((item, i) => {
                  const ref = useRef(null)
                  const isInView = useInView(ref, { once: true, margin: '-20px' })
                  return (
                    <motion.div
                      ref={ref}
                      key={i}
                      custom={i}
                      initial="hidden"
                      animate={isInView ? 'visible' : 'hidden'}
                      variants={fadeUp}
                      className="flex items-center gap-4 bg-white/[0.03] border border-white/[0.06] rounded-xl px-5 py-4 hover:border-white/[0.12] transition-all duration-300"
                    >
                      <div className={`${item.color} flex-shrink-0`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium text-sm">{item.label}</p>
                        <p className="text-white/40 text-xs">{item.detail}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ════════ SECURITY ════════ */}
      <Section id="security" className="py-16 sm:py-24 lg:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div className="text-center mb-16" variants={fadeUp}>
            <p className="text-[#D4A853] text-sm font-semibold uppercase tracking-wider mb-3">Security</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Built with enterprise-grade security</h2>
            <p className="mt-4 text-white/45 max-w-xl mx-auto">Your property data is protected by industry-leading security standards.</p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: ShieldCheckIcon, label: 'Firebase Authentication', desc: 'Multi-factor security' },
              { icon: LockIcon, label: 'Encrypted Data', desc: 'End-to-end protection' },
              { icon: DatabaseIcon, label: 'Data Isolation', desc: 'Per-user separation' },
              { icon: GlobeIcon, label: 'GDPR & UAE PDPL', desc: 'Fully compliant' },
            ].map((item, i) => {
              const ref = useRef(null)
              const isInView = useInView(ref, { once: true, margin: '-40px' })
              return (
                <motion.div
                  ref={ref}
                  key={i}
                  custom={i}
                  initial="hidden"
                  animate={isInView ? 'visible' : 'hidden'}
                  variants={scaleIn}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-center hover:border-[#D4A853]/20 transition-all duration-500"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#D4A853]/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-6 h-6 text-[#D4A853]" />
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-1">{item.label}</h3>
                  <p className="text-white/40 text-xs">{item.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </Section>

      {/* ════════ TESTIMONIALS ════════ */}
      <Section className="py-16 sm:py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-16" variants={fadeUp}>
            <p className="text-[#D4A853] text-sm font-semibold uppercase tracking-wider mb-3">Testimonials</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Trusted by property owners across the UAE</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Ahmed Al Mansouri',
                role: 'Manages 10 properties in Dubai',
                quote: 'Finally I can see everything in one place. The maintenance alerts alone saved me from a AED 50,000 water tank disaster.',
              },
              {
                name: 'Fatima Al Hashimi',
                role: 'Manages 6 villas in Abu Dhabi',
                quote: 'I used to track everything on paper and WhatsApp. PropVault replaced five different apps and gave me back my weekends.',
              },
              {
                name: 'Omar Khalid Rahman',
                role: 'Manages 23 units in Sharjah',
                quote: 'The 3D building view and instant occupancy tracking transformed how I present to property owners. Incredibly professional.',
              },
            ].map((t, i) => {
              const ref = useRef(null)
              const isInView = useInView(ref, { once: true, margin: '-40px' })
              return (
                <motion.div
                  ref={ref}
                  key={i}
                  custom={i}
                  initial="hidden"
                  animate={isInView ? 'visible' : 'hidden'}
                  variants={fadeUp}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.12] transition-all duration-500"
                >
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <svg key={j} className="w-4 h-4 text-[#D4A853]" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed mb-6 italic">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4A853]/30 to-[#D4A853]/10 flex items-center justify-center text-[#D4A853] font-bold text-sm">
                      {t.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{t.name}</p>
                      <p className="text-white/40 text-xs">{t.role}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </Section>

      {/* ════════ FINAL CTA ════════ */}
      <Section className="py-16 sm:py-24 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={scaleIn}
            className="relative bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] rounded-2xl sm:rounded-3xl p-8 sm:p-12 lg:p-16 text-center overflow-hidden"
          >
            {/* Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[#D4A853]/[0.08] rounded-full blur-[80px] pointer-events-none" />

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Ready to take control of your portfolio?
              </h2>
              <p className="text-white/45 max-w-lg mx-auto mb-8 leading-relaxed">
                Join property owners who have already made the switch. Free to start. No credit card required.
              </p>
              <GoldButton onClick={() => navigate('/signup')} size="lg">
                Get Started Free
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                </svg>
              </GoldButton>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ════════ FOOTER ════════ */}
      <footer id="footer" className="border-t border-white/[0.06] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Logo & tagline */}
            <div className="text-center md:text-left">
              <div className="flex items-center gap-2.5 justify-center md:justify-start">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-[#D4A853] to-[#E8C97A]">
                  <BuildingIcon className="w-4 h-4 text-[#0B1120]" />
                </div>
                <span className="text-base font-bold tracking-tight text-white">PropVault</span>
              </div>
              <p className="text-white/30 text-xs mt-2">Smart Property Management</p>
            </div>

            {/* Links */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              {['Features', 'Security', 'Privacy Policy', 'Terms of Service', 'Contact'].map(label => (
                <button
                  key={label}
                  onClick={() => {
                    if (label === 'Features') scrollTo('features')
                    else if (label === 'Security') scrollTo('security')
                  }}
                  className="text-white/40 hover:text-white/70 transition-colors duration-300"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Copyright */}
            <p className="text-white/25 text-xs text-center md:text-right">
              &copy; {new Date().getFullYear()} PropVault. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
