import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'

/* ─── PALETTE — Premium Dark + Gold ───
 * UI/UX Pro Max skill: "Luxury/Premium Brand" (#1C1917 + gold accent) combined
 * with "Consulting Authority" navy. Modern SaaS dark aesthetic — think Linear,
 * Vercel, Ramp, Mercury. Suited to UAE luxury real estate positioning.
 *   Background (deep navy):    #0A0E27
 *   Surface (elevated):        #111827
 *   Surface (card glass):      rgba(255,255,255,0.04)
 *   Border subtle:             rgba(255,255,255,0.08)
 *   Gold (accent/CTA):         #D4A853
 *   Gold light (hover):        #E8C97A
 *   Text primary:              #F8FAFC
 *   Text muted:                rgba(255,255,255,0.55)
 */

/* ─── LANDING PAGE TRANSLATIONS ─── */
const L = {
  en: {
    dir: 'ltr',
    badge: 'Smart Property Management',
    heroTitle1: 'Every property.',
    heroTitle2: ' Every detail.',
    heroTitle3: ' Always in control.',
    heroSub: 'The only platform built for serious property owners in the UAE. Track every unit, every maintenance record, every dirham — all in one place.',
    getStarted: 'Get Started Free',
    seeHow: 'See How It Works',
    navFeatures: 'Features',
    navHow: 'How It Works',
    navSecurity: 'Security',
    navContact: 'Contact',
    // Problem
    problemTitle1: 'Still managing properties with ',
    problemTitle2: 'spreadsheets and WhatsApp?',
    painTitle1: 'Missed Deadlines',
    painDesc1: 'Missed maintenance deadlines costing thousands in emergency repairs and tenant complaints.',
    painTitle2: 'Zero Visibility',
    painDesc2: 'No visibility into which units are occupied, overdue, or need urgent attention.',
    painTitle3: 'Scattered Data',
    painDesc3: 'Tenant data scattered across your phone, email, WhatsApp, and stacks of paper.',
    // Features
    featLabel: 'Features',
    featTitle1: 'One platform. ',
    featTitle2: 'Total visibility.',
    featSub: 'Everything you need to manage your property portfolio with confidence.',
    feat1Title: 'Smart Property Dashboard',
    feat1Desc: 'See your entire portfolio at a glance — occupancy, revenue, alerts, and more in real-time.',
    feat2Title: 'Granular Maintenance Tracking',
    feat2Desc: 'Water tanks, AC units, elevators, fire safety — track every system with smart scheduling.',
    feat3Title: 'Unit Management',
    feat3Desc: 'Track every tenant, lease agreement, payment status, and Ejari registration in one place.',
    feat4Title: 'Financial Overview',
    feat4Desc: 'Income vs expenses, occupancy rates, rent collection, and VAT tracking for commercial properties.',
    feat5Title: '3D Building Viewer',
    feat5Desc: 'Visualize which units are occupied, vacant, or have alerts with an interactive 3D model.',
    feat6Title: 'Intelligent Alert System',
    feat6Desc: 'Never miss a maintenance deadline, lease expiry, or document renewal date again.',
    // How it works
    howLabel: 'How It Works',
    howTitle: 'Up and running in minutes',
    step1Title: 'Add your properties',
    step1Desc: 'Villas, apartments, buildings, townhouses — add them all in seconds.',
    step2Title: 'Set up units & schedules',
    step2Desc: 'Configure your units, tenants, and maintenance schedules with guided setup.',
    step3Title: 'Get real-time visibility',
    step3Desc: 'Instant alerts, live dashboard, and full portfolio oversight from day one.',
    // Property types
    typesLabel: 'Property Types',
    typesTitle: 'Built for every property type',
    type1: 'Residential Buildings',
    type2: 'Villas',
    type3: 'Townhouses',
    type4: 'Apartments',
    // Maintenance
    maintLabel: 'Maintenance Tracking',
    maintTitle: 'Granular tracking for every system in your property',
    maintSub: 'From water tanks to fire safety systems — track every maintenance schedule, service history, and upcoming deadline across your entire portfolio.',
    alertOverdue: 'Overdue: Water Tank Cleaning',
    alertUpcoming: 'Upcoming: AC Service in 5 days',
    maint1: 'Water Tank', maint1d: 'Capacity, last cleaned, next due date',
    maint2: 'AC Units', maint2d: 'Per-unit service history & filter replacement',
    maint3: 'Elevators', maint3d: 'Certification & service scheduling',
    maint4: 'Fire Safety', maint4d: 'Extinguisher & suppression system checks',
    maint5: 'Generator & Electrical', maint5d: 'Load testing, panel inspections',
    maint6: 'Plumbing, Roof, Pool & More', maint6d: 'Full lifecycle tracking for every system',
    // Security
    secLabel: 'Security',
    secTitle: 'Built with enterprise-grade security',
    secSub: 'Your property data is protected by industry-leading security standards.',
    sec1: 'Firebase Authentication', sec1d: 'Multi-factor security',
    sec2: 'Encrypted Data', sec2d: 'End-to-end protection',
    sec3: 'Data Isolation', sec3d: 'Per-user separation',
    sec4: 'GDPR & UAE PDPL', sec4d: 'Fully compliant',
    // Testimonials
    testLabel: 'Testimonials',
    testTitle: 'Trusted by property owners across the UAE',
    test1Name: 'Ahmed Al Mansouri',
    test1Role: 'Manages 10 properties in Dubai',
    test1Quote: 'Finally I can see everything in one place. The maintenance alerts alone saved me from a AED 50,000 water tank disaster.',
    test2Name: 'Fatima Al Hashimi',
    test2Role: 'Manages 6 villas in Abu Dhabi',
    test2Quote: 'I used to track everything on paper and WhatsApp. Bait to Maintain replaced five different apps and gave me back my weekends.',
    test3Name: 'Omar Khalid Rahman',
    test3Role: 'Manages 23 units in Sharjah',
    test3Quote: 'The 3D building view and instant occupancy tracking transformed how I present to property owners. Incredibly professional.',
    // CTA
    ctaTitle: 'Ready to take control of your portfolio?',
    ctaSub: 'Join property owners who have already made the switch. Free to start. No credit card required.',
    // Footer
    footerTagline: 'Smart Property Management',
    footerPrivacy: 'Privacy Policy',
    footerTerms: 'Terms of Service',
    // Stats
    statUnits: 'Units Managed',
    statAlerts: 'Alerts Caught',
    statTime: 'Admin Time Saved',
  },
  ar: {
    dir: 'rtl',
    badge: 'إدارة عقارات ذكية',
    heroTitle1: 'كل عقار.',
    heroTitle2: ' كل تفصيلة.',
    heroTitle3: ' دائماً تحت السيطرة.',
    heroSub: 'المنصة الوحيدة المصممة لأصحاب العقارات الجادين في الإمارات. تتبع كل وحدة، كل سجل صيانة، كل درهم — في مكان واحد.',
    getStarted: 'ابدأ مجاناً',
    seeHow: 'شاهد كيف يعمل',
    navFeatures: 'المميزات',
    navHow: 'كيف يعمل',
    navSecurity: 'الأمان',
    navContact: 'تواصل',
    // Problem
    problemTitle1: 'لا تزال تدير عقاراتك بـ',
    problemTitle2: 'جداول البيانات والواتساب؟',
    painTitle1: 'مواعيد فائتة',
    painDesc1: 'مواعيد صيانة فائتة تكلفك آلاف الدراهم في إصلاحات طارئة وشكاوى المستأجرين.',
    painTitle2: 'رؤية معدومة',
    painDesc2: 'لا رؤية واضحة للوحدات المشغولة أو المتأخرة أو التي تحتاج اهتماماً عاجلاً.',
    painTitle3: 'بيانات مبعثرة',
    painDesc3: 'بيانات المستأجرين مبعثرة بين هاتفك وبريدك الإلكتروني والواتساب وأكوام الورق.',
    // Features
    featLabel: 'المميزات',
    featTitle1: 'منصة واحدة. ',
    featTitle2: 'رؤية شاملة.',
    featSub: 'كل ما تحتاجه لإدارة محفظتك العقارية بثقة.',
    feat1Title: 'لوحة تحكم ذكية',
    feat1Desc: 'اطلع على محفظتك بالكامل بلمحة — الإشغال، الإيرادات، التنبيهات، والمزيد في الوقت الفعلي.',
    feat2Title: 'تتبع صيانة دقيق',
    feat2Desc: 'خزانات المياه، وحدات التكييف، المصاعد، السلامة من الحريق — تتبع كل نظام بجدولة ذكية.',
    feat3Title: 'إدارة الوحدات',
    feat3Desc: 'تتبع كل مستأجر، عقد إيجار، حالة دفع، وتسجيل إيجاري في مكان واحد.',
    feat4Title: 'نظرة مالية شاملة',
    feat4Desc: 'الدخل مقابل المصروفات، نسب الإشغال، تحصيل الإيجارات، وتتبع ضريبة القيمة المضافة.',
    feat5Title: 'عارض المبنى ثلاثي الأبعاد',
    feat5Desc: 'تصور الوحدات المشغولة والشاغرة والتنبيهات من خلال نموذج تفاعلي ثلاثي الأبعاد.',
    feat6Title: 'نظام تنبيهات ذكي',
    feat6Desc: 'لا تفوت أي موعد صيانة أو انتهاء عقد إيجار أو تجديد مستند مرة أخرى.',
    // How it works
    howLabel: 'كيف يعمل',
    howTitle: 'جاهز للعمل في دقائق',
    step1Title: 'أضف عقاراتك',
    step1Desc: 'فلل، شقق، مباني، تاون هاوس — أضفها جميعاً في ثوانٍ.',
    step2Title: 'إعداد الوحدات والجداول',
    step2Desc: 'قم بتهيئة وحداتك ومستأجريك وجداول الصيانة مع إعداد موجه.',
    step3Title: 'احصل على رؤية فورية',
    step3Desc: 'تنبيهات فورية، لوحة تحكم حية، وإشراف كامل على المحفظة من اليوم الأول.',
    // Property types
    typesLabel: 'أنواع العقارات',
    typesTitle: 'مصمم لكل نوع عقار',
    type1: 'مباني سكنية',
    type2: 'فلل',
    type3: 'تاون هاوس',
    type4: 'شقق',
    // Maintenance
    maintLabel: 'تتبع الصيانة',
    maintTitle: 'تتبع دقيق لكل نظام في عقارك',
    maintSub: 'من خزانات المياه إلى أنظمة السلامة — تتبع كل جدول صيانة وتاريخ خدمة وموعد قادم عبر محفظتك بالكامل.',
    alertOverdue: 'متأخر: تنظيف خزان المياه',
    alertUpcoming: 'قادم: خدمة التكييف خلال 5 أيام',
    maint1: 'خزان المياه', maint1d: 'السعة، آخر تنظيف، الموعد القادم',
    maint2: 'وحدات التكييف', maint2d: 'سجل خدمة لكل وحدة واستبدال الفلاتر',
    maint3: 'المصاعد', maint3d: 'الشهادات وجدولة الخدمة',
    maint4: 'السلامة من الحريق', maint4d: 'فحص طفايات الحريق وأنظمة الإطفاء',
    maint5: 'المولدات والكهرباء', maint5d: 'اختبار الحمل وفحص اللوحات',
    maint6: 'السباكة والسقف والمسبح والمزيد', maint6d: 'تتبع دورة حياة كاملة لكل نظام',
    // Security
    secLabel: 'الأمان',
    secTitle: 'مبني بأمان على مستوى المؤسسات',
    secSub: 'بيانات عقاراتك محمية بمعايير أمان رائدة في الصناعة.',
    sec1: 'مصادقة Firebase', sec1d: 'أمان متعدد العوامل',
    sec2: 'بيانات مشفرة', sec2d: 'حماية شاملة',
    sec3: 'عزل البيانات', sec3d: 'فصل لكل مستخدم',
    sec4: 'GDPR وقانون حماية البيانات الإماراتي', sec4d: 'متوافق بالكامل',
    // Testimonials
    testLabel: 'آراء العملاء',
    testTitle: 'موثوق من أصحاب العقارات في جميع أنحاء الإمارات',
    test1Name: 'أحمد المنصوري',
    test1Role: 'يدير 10 عقارات في دبي',
    test1Quote: 'أخيراً أستطيع رؤية كل شيء في مكان واحد. تنبيهات الصيانة وحدها أنقذتني من كارثة خزان مياه بقيمة 50,000 درهم.',
    test2Name: 'فاطمة الهاشمي',
    test2Role: 'تدير 6 فلل في أبوظبي',
    test2Quote: 'كنت أتتبع كل شيء على الورق والواتساب. Bait to Maintain استبدل خمسة تطبيقات مختلفة وأعاد لي عطلات نهاية الأسبوع.',
    test3Name: 'عمر خالد رحمن',
    test3Role: 'يدير 23 وحدة في الشارقة',
    test3Quote: 'عرض المبنى ثلاثي الأبعاد وتتبع الإشغال الفوري غيّرا طريقة عرضي لأصحاب العقارات. احترافية لا تصدق.',
    // CTA
    ctaTitle: 'مستعد للسيطرة على محفظتك؟',
    ctaSub: 'انضم إلى أصحاب العقارات الذين انتقلوا بالفعل. مجاني للبدء. لا حاجة لبطاقة ائتمان.',
    // Footer
    footerTagline: 'إدارة عقارات ذكية',
    footerPrivacy: 'سياسة الخصوصية',
    footerTerms: 'شروط الخدمة',
    // Stats
    statUnits: 'وحدة مُدارة',
    statAlerts: 'تنبيهات تم اكتشافها',
    statTime: 'وقت إداري موفر',
  },
}

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

/* ─── BUTTONS — Premium gold CTA, glass secondary ─── */
function GoldButton({ children, onClick, size = 'default', className = '' }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ y: 0 }}
      transition={{ duration: 0.2 }}
      className={`cursor-pointer inline-flex items-center justify-center gap-1.5 sm:gap-2 font-semibold rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0E27] focus-visible:ring-[#D4A853] ${
        size === 'lg' ? 'px-6 py-3.5 sm:px-8 sm:py-4 text-sm sm:text-base' : 'px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm'
      } bg-gradient-to-b from-[#E8C97A] to-[#D4A853] text-[#0A0E27] hover:from-[#F0D68C] hover:to-[#E8C97A] shadow-[0_8px_24px_-8px_rgba(212,168,83,0.5)] hover:shadow-[0_12px_32px_-8px_rgba(212,168,83,0.7)] ${className}`}
    >
      {children}
    </motion.button>
  )
}

function GlassButton({ children, onClick, className = '' }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ y: 0 }}
      transition={{ duration: 0.2 }}
      className={`cursor-pointer inline-flex items-center justify-center gap-1.5 sm:gap-2 font-semibold rounded-lg px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm border border-white/15 bg-white/[0.04] backdrop-blur text-white/90 hover:bg-white/[0.08] hover:border-white/25 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0E27] focus-visible:ring-white/40 ${className}`}
    >
      {children}
    </motion.button>
  )
}

/* ─── FEATURE CARD — Glassmorphism surface with gold icon ─── */
function FeatureCard({ icon: Icon, title, description, index, className = '', children }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.div
      ref={ref}
      custom={index}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={fadeUp}
      className={`group relative bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] rounded-2xl p-6 sm:p-7 hover:border-[#D4A853]/40 hover:from-white/[0.08] transition-all duration-300 overflow-hidden ${className}`}
    >
      {/* soft glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-20 -end-20 w-60 h-60 bg-[#D4A853]/10 rounded-full blur-3xl" />
      </div>
      <div className="relative">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D4A853]/25 to-[#D4A853]/5 border border-[#D4A853]/15 flex items-center justify-center mb-5">
          <Icon className="w-5 h-5 text-[#D4A853]" />
        </div>
        <h3 className="text-white font-semibold text-base sm:text-lg mb-2 tracking-tight">{title}</h3>
        <p className="text-white/55 text-sm leading-relaxed">{description}</p>
        {children}
      </div>
    </motion.div>
  )
}

/* ─── MAIN LANDING PAGE ─── */
export default function LandingPage() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [lang, setLang] = useState(() => {
    try {
      const stored = localStorage.getItem('landingLang')
      if (stored && L[stored]) return stored
    } catch {}
    return 'en'
  })

  const tx = (key) => L[lang]?.[key] || L.en[key] || key
  const isRTL = lang === 'ar'

  // Override document direction for landing page
  useEffect(() => {
    const prevDir = document.documentElement.getAttribute('dir')
    const prevLang = document.documentElement.getAttribute('lang')
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr')
    document.documentElement.setAttribute('lang', lang)
    return () => {
      document.documentElement.setAttribute('dir', prevDir || 'ltr')
      document.documentElement.setAttribute('lang', prevLang || 'en')
    }
  }, [lang, isRTL])

  function toggleLang() {
    const next = lang === 'en' ? 'ar' : 'en'
    setLang(next)
    localStorage.setItem('landingLang', next)
  }

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
    { label: tx('navFeatures'), id: 'features' },
    { label: tx('navHow'), id: 'how-it-works' },
    { label: tx('navSecurity'), id: 'security' },
    { label: tx('navContact'), id: 'footer' },
  ]

  // Typography — modern geometric sans, no display serif. Plus Jakarta Sans gives
  // a premium SaaS feel (Linear/Vercel school). Inter for data-dense copy.
  const BODY_FONT = isRTL ? '"Noto Sans Arabic", "Inter", sans-serif' : '"Inter", "Plus Jakarta Sans", sans-serif'
  const HEAD_FONT = isRTL ? '"Noto Sans Arabic", "Plus Jakarta Sans", sans-serif' : '"Plus Jakarta Sans", "Inter", sans-serif'

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#0A0E27] text-white overflow-x-hidden relative" style={{ fontFamily: BODY_FONT }}>
      {/* Ambient radial gradients for depth */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 -start-1/4 w-[800px] h-[800px] bg-[#D4A853]/[0.04] rounded-full blur-[140px]" />
        <div className="absolute top-1/3 end-0 w-[600px] h-[600px] bg-[#D4A853]/[0.025] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 w-[700px] h-[700px] bg-[#6366F1]/[0.025] rounded-full blur-[140px]" />
      </div>

      {/* ════════ NAV ════════ */}
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#0A0E27]/75 backdrop-blur-xl border-b border-white/[0.06]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-[#E8C97A] to-[#D4A853] shadow-[0_0_20px_-4px_rgba(212,168,83,0.6)]">
                <BuildingIcon className="w-5 h-5 text-[#0A0E27]" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white" style={{ fontFamily: HEAD_FONT }}>Bait to Maintain</span>
            </div>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map(link => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="cursor-pointer text-sm text-white/60 hover:text-white font-medium transition-colors duration-200"
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* CTA + Lang */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={toggleLang}
                className="cursor-pointer px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-all duration-200"
              >
                {lang === 'en' ? 'العربية' : 'English'}
              </button>
              <GoldButton onClick={() => navigate('/signup')}>{tx('getStarted')}</GoldButton>
            </div>

            {/* Mobile burger + lang */}
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={toggleLang}
                className="cursor-pointer px-2.5 py-1.5 text-[10px] font-semibold rounded-md border border-white/15 text-white/70 hover:text-white transition-colors duration-200"
              >
                {lang === 'en' ? 'AR' : 'EN'}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="cursor-pointer p-2 text-white/70 hover:text-white"
                aria-label="Toggle menu"
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
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#0A0E27]/95 backdrop-blur-xl border-b border-white/[0.06] overflow-hidden"
            >
              <div className="px-6 py-4 space-y-3">
                {navLinks.map(link => (
                  <button
                    key={link.id}
                    onClick={() => scrollTo(link.id)}
                    className="cursor-pointer block w-full text-start text-sm text-white/70 hover:text-white font-medium py-2 transition-colors duration-200"
                  >
                    {link.label}
                  </button>
                ))}
                <div className="pt-2">
                  <GoldButton onClick={() => navigate('/signup')} className="w-full">{tx('getStarted')}</GoldButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ════════ HERO — Premium dark with gold accent + glass product card ════════ */}
      <section className="relative flex items-center pt-28 pb-16 sm:pt-32 sm:pb-20 lg:pt-36 lg:pb-28">
        {/* Hero-local grain/pattern for depth */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left copy (7 cols) */}
            <div className="text-center lg:text-start lg:col-span-7">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4A853]/10 border border-[#D4A853]/20 mb-7"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-pulse" />
                <span className="text-[#E8C97A] text-[11px] font-semibold uppercase tracking-[0.14em]">{tx('badge')}</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="text-4xl sm:text-5xl lg:text-[4rem] xl:text-[4.5rem] font-bold leading-[1.02] tracking-tight text-white"
                style={{ fontFamily: HEAD_FONT, letterSpacing: isRTL ? 'normal' : '-0.025em' }}
              >
                {tx('heroTitle1')}
                <span className="bg-gradient-to-r from-[#E8C97A] via-[#D4A853] to-[#B8913D] bg-clip-text text-transparent">{tx('heroTitle2')}</span>
                {tx('heroTitle3')}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-6 text-base sm:text-lg text-white/60 leading-relaxed max-w-xl mx-auto lg:mx-0"
              >
                {tx('heroSub')}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-9 flex flex-row flex-wrap gap-3 sm:gap-4 justify-center lg:justify-start"
              >
                <GoldButton onClick={() => navigate('/signup')} size="lg">
                  {tx('getStarted')}
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" /><path d={isRTL ? 'M12 5l-7 7 7 7' : 'M12 5l7 7-7 7'} />
                  </svg>
                </GoldButton>
                <GlassButton onClick={() => scrollTo('how-it-works')}>
                  {tx('seeHow')}
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14" /><path d="M19 12l-7 7-7-7" />
                  </svg>
                </GlassButton>
              </motion.div>

              {/* Trust strip — animated stat row */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.55 }}
                className="mt-12 grid grid-cols-3 gap-4 sm:gap-8 max-w-xl mx-auto lg:mx-0 pt-8 border-t border-white/[0.08]"
              >
                {[
                  { n: <><Counter end={1200} />+</>, l: tx('statUnits') },
                  { n: <><Counter end={98} />%</>, l: 'Uptime' },
                  { n: <><Counter end={40} />%</>, l: tx('statTime') },
                ].map((s, i) => (
                  <div key={i} className="text-center lg:text-start">
                    <div className="text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: HEAD_FONT }}>{s.n}</div>
                    <div className="text-[11px] text-white/45 mt-1 uppercase tracking-wider">{s.l}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: glassmorphism product preview (5 cols) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block lg:col-span-5"
            >
              <div className="relative">
                {/* Gold glow behind card */}
                <div className="absolute -inset-4 bg-gradient-to-br from-[#D4A853]/20 via-transparent to-[#6366F1]/10 rounded-3xl blur-3xl" aria-hidden="true" />

                {/* Glass card */}
                <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
                  {/* Header bar */}
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                      <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                      <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-[#D4A853] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-pulse" /> Live
                    </span>
                  </div>

                  {/* Dashboard mock */}
                  <div className="p-5 sm:p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Portfolio</h4>
                        <p className="text-white text-lg font-semibold mt-0.5" style={{ fontFamily: HEAD_FONT }}>Dubai Marina</p>
                      </div>
                      <span className="text-[11px] text-[#D4A853] px-2.5 py-1 rounded-md bg-[#D4A853]/10 border border-[#D4A853]/15 font-semibold">+12.4%</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { n: <Counter end={247} />, l: 'Units' },
                        { n: <><Counter end={98} />%</>, l: 'Occupied' },
                        { n: <Counter end={12} />, l: 'Alerts' },
                      ].map((s, i) => (
                        <div key={i} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                          <div className="text-xl font-bold text-white" style={{ fontFamily: HEAD_FONT }}>{s.n}</div>
                          <div className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wider">{s.l}</div>
                        </div>
                      ))}
                    </div>

                    {/* Bar chart */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-white/40 mb-2">
                        <span>Revenue (12 mo)</span>
                        <span className="text-[#D4A853]">AED 2.4M</span>
                      </div>
                      <div className="flex items-end gap-1 h-20">
                        {[32, 48, 38, 62, 44, 72, 58, 88, 68, 54, 82, 78].map((h, i) => (
                          <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-[#D4A853]/80 via-[#D4A853]/60 to-[#D4A853]/20" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>

                    {/* Alert rows */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-red-500/20 bg-red-500/[0.08]">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        <span className="text-xs text-red-200 font-medium">{tx('alertOverdue')}</span>
                      </div>
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.08]">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span className="text-xs text-amber-200 font-medium">{tx('alertUpcoming')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════════ PROBLEM — dark glass pain-point cards ════════ */}
      <Section id="problem" className="py-20 sm:py-24 lg:py-32 relative">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-14 lg:mb-16 max-w-3xl mx-auto" variants={fadeUp} custom={0}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.1]" style={{ fontFamily: HEAD_FONT, letterSpacing: '-0.02em' }}>
              {tx('problemTitle1')}
              <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">{tx('problemTitle2')}</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-5">
            {[
              { icon: AlertIcon, title: tx('painTitle1'), desc: tx('painDesc1'), accent: 'from-red-500/25 to-red-500/5', tint: 'text-red-400' },
              { icon: ChartIcon, title: tx('painTitle2'), desc: tx('painDesc2'), accent: 'from-orange-500/25 to-orange-500/5', tint: 'text-orange-400' },
              { icon: UsersIcon, title: tx('painTitle3'), desc: tx('painDesc3'), accent: 'from-amber-500/25 to-amber-500/5', tint: 'text-amber-400' },
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
                  className="relative bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] rounded-2xl p-7 sm:p-8 hover:border-white/20 transition-colors duration-300"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.accent} border border-white/[0.08] flex items-center justify-center mb-5`}>
                    <item.icon className={`w-5 h-5 ${item.tint}`} />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2 tracking-tight" style={{ fontFamily: HEAD_FONT }}>{item.title}</h3>
                  <p className="text-white/55 text-sm leading-relaxed">{item.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </Section>

      {/* ════════ FEATURES — Bento grid (Apple / Linear-style modular layout) ════════ */}
      <Section id="features" className="py-20 sm:py-24 lg:py-32 relative">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-14 lg:mb-16 max-w-3xl mx-auto" variants={fadeUp}>
            <p className="text-[#D4A853] text-xs font-semibold uppercase tracking-[0.24em] mb-4">{tx('featLabel')}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.1]" style={{ fontFamily: HEAD_FONT, letterSpacing: '-0.02em' }}>
              {tx('featTitle1')}
              <span className="bg-gradient-to-r from-[#E8C97A] to-[#D4A853] bg-clip-text text-transparent">{tx('featTitle2')}</span>
            </h2>
            <p className="mt-5 text-white/55 text-base sm:text-lg leading-relaxed">{tx('featSub')}</p>
          </motion.div>

          {/* 4-col 3-row bento grid (desktop), stacked on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-3 gap-4 sm:gap-5 auto-rows-fr">
            {/* 1. Dashboard — hero bento (2×2) with inline chart preview */}
            <FeatureCard
              index={0}
              icon={LayoutIcon}
              title={tx('feat1Title')}
              description={tx('feat1Desc')}
              className="lg:col-span-2 lg:row-span-2"
            >
              <div className="mt-6 rounded-xl border border-white/[0.08] bg-[#0A0E27]/60 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-semibold">Occupancy</span>
                  <span className="text-[11px] text-[#D4A853] font-semibold">98%</span>
                </div>
                <div className="flex items-end gap-1.5 h-16">
                  {[42, 56, 48, 68, 54, 78, 64, 88, 74, 60, 84, 92].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-[#D4A853]/70 to-[#D4A853]/30" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-white/[0.06]">
                  <div><div className="text-white font-bold text-sm" style={{ fontFamily: HEAD_FONT }}>247</div><div className="text-[10px] text-white/40 uppercase tracking-wider">Units</div></div>
                  <div><div className="text-white font-bold text-sm" style={{ fontFamily: HEAD_FONT }}>AED 2.4M</div><div className="text-[10px] text-white/40 uppercase tracking-wider">Revenue</div></div>
                  <div><div className="text-white font-bold text-sm" style={{ fontFamily: HEAD_FONT }}>12</div><div className="text-[10px] text-white/40 uppercase tracking-wider">Alerts</div></div>
                </div>
              </div>
            </FeatureCard>

            {/* 2. 3D Building — tall (1×2) with mini visual */}
            <FeatureCard
              index={1}
              icon={CubeIcon}
              title={tx('feat5Title')}
              description={tx('feat5Desc')}
              className="lg:col-span-1 lg:row-span-2"
            >
              <div className="mt-6 rounded-xl border border-white/[0.08] bg-[#0A0E27]/60 p-4 flex items-center justify-center aspect-square">
                <svg viewBox="0 0 120 120" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5">
                  {/* Simple isometric building */}
                  <defs>
                    <linearGradient id="bldgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#D4A853" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#D4A853" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  <path d="M60 20 L95 38 L95 88 L60 106 L25 88 L25 38 Z" fill="url(#bldgGrad)" stroke="#D4A853" strokeOpacity="0.5" />
                  <path d="M25 38 L60 56 L95 38" stroke="#D4A853" strokeOpacity="0.5" />
                  <path d="M60 56 L60 106" stroke="#D4A853" strokeOpacity="0.5" />
                  {/* Windows */}
                  {[0, 1, 2].map(row => (
                    <g key={row}>
                      <rect x={32 + row * 0.5} y={46 + row * 14} width="10" height="8" fill="#D4A853" fillOpacity={0.5 - row * 0.1} />
                      <rect x={46} y={53 + row * 14} width="10" height="8" fill="#D4A853" fillOpacity={0.6 - row * 0.1} />
                      <rect x={66} y={53 + row * 14} width="10" height="8" fill="#D4A853" fillOpacity={0.3 - row * 0.05} />
                      <rect x={80} y={46 + row * 14} width="10" height="8" fill="#D4A853" fillOpacity={0.4 - row * 0.1} />
                    </g>
                  ))}
                </svg>
              </div>
            </FeatureCard>

            {/* 3. Alerts — small (1×1) */}
            <FeatureCard
              index={2}
              icon={AlertIcon}
              title={tx('feat6Title')}
              description={tx('feat6Desc')}
              className="lg:col-span-1 lg:row-span-1"
            />

            {/* 4. Maintenance — small (1×1) */}
            <FeatureCard
              index={3}
              icon={WrenchIcon}
              title={tx('feat2Title')}
              description={tx('feat2Desc')}
              className="lg:col-span-1 lg:row-span-1"
            />

            {/* 5. Unit Mgmt — wide (2×1) */}
            <FeatureCard
              index={4}
              icon={UsersIcon}
              title={tx('feat3Title')}
              description={tx('feat3Desc')}
              className="lg:col-span-2 lg:row-span-1"
            />

            {/* 6. Financial — wide (2×1) */}
            <FeatureCard
              index={5}
              icon={ChartIcon}
              title={tx('feat4Title')}
              description={tx('feat4Desc')}
              className="lg:col-span-2 lg:row-span-1"
            />
          </div>
        </div>
      </Section>

      {/* ════════ HOW IT WORKS — Premium numbered timeline ════════ */}
      <Section id="how-it-works" className="py-20 sm:py-24 lg:py-32 relative">
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-14 lg:mb-20" variants={fadeUp}>
            <p className="text-[#D4A853] text-xs font-semibold uppercase tracking-[0.24em] mb-4">{tx('howLabel')}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.1]" style={{ fontFamily: HEAD_FONT, letterSpacing: '-0.02em' }}>{tx('howTitle')}</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-10 md:gap-6 relative">
            {/* Connector line with gold gradient (desktop) */}
            <div className="hidden md:block absolute top-8 left-[14%] right-[14%] h-px bg-gradient-to-r from-transparent via-[#D4A853]/30 to-transparent" aria-hidden="true" />
            {[
              { step: '01', title: tx('step1Title'), desc: tx('step1Desc'), icon: BuildingIcon },
              { step: '02', title: tx('step2Title'), desc: tx('step2Desc'), icon: WrenchIcon },
              { step: '03', title: tx('step3Title'), desc: tx('step3Desc'), icon: ZapIcon },
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
                  <div className="relative mx-auto mb-6 w-fit">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4A853]/25 to-[#D4A853]/5 border border-[#D4A853]/25 flex items-center justify-center mx-auto relative z-10 backdrop-blur">
                      <item.icon className="w-6 h-6 text-[#D4A853]" />
                    </div>
                    <div className="absolute -top-2 -end-2 px-2 py-0.5 rounded-full bg-gradient-to-b from-[#E8C97A] to-[#D4A853] z-10 shadow-[0_4px_12px_-2px_rgba(212,168,83,0.6)]">
                      <span className="text-[10px] font-bold text-[#0A0E27] tracking-wider">{item.step}</span>
                    </div>
                  </div>
                  <h3 className="text-white font-semibold text-xl mb-3 tracking-tight" style={{ fontFamily: HEAD_FONT }}>{item.title}</h3>
                  <p className="text-white/55 text-sm leading-relaxed max-w-xs mx-auto">{item.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </Section>

      {/* ════════ PROPERTY TYPES — Glass tiles with gold illustrations ════════ */}
      <Section className="py-20 sm:py-24 lg:py-32 relative">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-14 lg:mb-16" variants={fadeUp}>
            <p className="text-[#D4A853] text-xs font-semibold uppercase tracking-[0.24em] mb-4">{tx('typesLabel')}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.1]" style={{ fontFamily: HEAD_FONT, letterSpacing: '-0.02em' }}>{tx('typesTitle')}</h2>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[
              { icon: ResidentialIcon, label: tx('type1') },
              { icon: VillaIcon, label: tx('type2') },
              { icon: TownhouseIcon, label: tx('type3') },
              { icon: ApartmentIcon, label: tx('type4') },
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
                  whileHover={{ y: -4 }}
                  className="group bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08] rounded-2xl p-8 sm:p-10 text-center hover:border-[#D4A853]/30 hover:from-white/[0.08] transition-all duration-300 cursor-default"
                >
                  <div className="text-[#D4A853]/80 group-hover:text-[#D4A853] transition-colors duration-300 flex justify-center mb-4">
                    <item.icon />
                  </div>
                  <h3 className="text-white font-semibold text-sm tracking-tight" style={{ fontFamily: HEAD_FONT }}>{item.label}</h3>
                </motion.div>
              )
            })}
          </div>
        </div>
      </Section>

      {/* ════════ MAINTENANCE SHOWCASE — Split layout with glass cards ════════ */}
      <Section className="py-20 sm:py-24 lg:py-32 relative">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div variants={slideInLeft}>
              <p className="text-[#D4A853] text-xs font-semibold uppercase tracking-[0.24em] mb-4">{tx('maintLabel')}</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-6 leading-[1.1]" style={{ fontFamily: HEAD_FONT, letterSpacing: '-0.02em' }}>
                {tx('maintTitle')}
              </h2>
              <p className="text-white/60 text-base sm:text-lg leading-relaxed mb-8 max-w-xl">
                {tx('maintSub')}
              </p>

              {/* Alert badges */}
              <div className="flex flex-wrap gap-3">
                <motion.span
                  animate={{ opacity: [0.85, 1, 0.85] }}
                  transition={{ duration: 2.4, repeat: Infinity }}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-xs font-semibold"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  {tx('alertOverdue')}
                </motion.span>
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {tx('alertUpcoming')}
                </span>
              </div>
            </motion.div>

            <motion.div variants={slideInRight}>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { icon: DropletIcon, label: tx('maint1'), detail: tx('maint1d'), color: 'text-blue-300', bg: 'from-blue-500/15 to-blue-500/5' },
                  { icon: ThermometerIcon, label: tx('maint2'), detail: tx('maint2d'), color: 'text-cyan-300', bg: 'from-cyan-500/15 to-cyan-500/5' },
                  { icon: ArrowUpIcon, label: tx('maint3'), detail: tx('maint3d'), color: 'text-violet-300', bg: 'from-violet-500/15 to-violet-500/5' },
                  { icon: FlameIcon, label: tx('maint4'), detail: tx('maint4d'), color: 'text-red-300', bg: 'from-red-500/15 to-red-500/5' },
                  { icon: ZapIcon, label: tx('maint5'), detail: tx('maint5d'), color: 'text-yellow-300', bg: 'from-yellow-500/15 to-yellow-500/5' },
                  { icon: WrenchIcon, label: tx('maint6'), detail: tx('maint6d'), color: 'text-emerald-300', bg: 'from-emerald-500/15 to-emerald-500/5' },
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
                      className="flex items-start gap-3 bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08] rounded-xl p-4 hover:border-white/15 transition-colors duration-300"
                    >
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${item.bg} border border-white/[0.06] flex items-center justify-center flex-shrink-0`}>
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-semibold text-sm tracking-tight">{item.label}</p>
                        <p className="text-white/45 text-xs leading-relaxed mt-0.5">{item.detail}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ════════ SECURITY — 4-up glass trust badges ════════ */}
      <Section id="security" className="py-20 sm:py-24 lg:py-32 relative">
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-14 lg:mb-16 max-w-2xl mx-auto" variants={fadeUp}>
            <p className="text-[#D4A853] text-xs font-semibold uppercase tracking-[0.24em] mb-4">{tx('secLabel')}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.1]" style={{ fontFamily: HEAD_FONT, letterSpacing: '-0.02em' }}>{tx('secTitle')}</h2>
            <p className="mt-5 text-white/55 text-base sm:text-lg leading-relaxed">{tx('secSub')}</p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[
              { icon: ShieldCheckIcon, label: tx('sec1'), desc: tx('sec1d') },
              { icon: LockIcon, label: tx('sec2'), desc: tx('sec2d') },
              { icon: DatabaseIcon, label: tx('sec3'), desc: tx('sec3d') },
              { icon: GlobeIcon, label: tx('sec4'), desc: tx('sec4d') },
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
                  className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08] rounded-2xl p-6 lg:p-7 text-center hover:border-[#D4A853]/25 transition-colors duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4A853]/20 to-[#D4A853]/5 border border-[#D4A853]/15 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-5 h-5 text-[#D4A853]" />
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-1 tracking-tight">{item.label}</h3>
                  <p className="text-white/45 text-xs leading-relaxed">{item.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </Section>

      {/* ════════ TESTIMONIALS — Glass cards with gold stars ════════ */}
      <Section className="py-20 sm:py-24 lg:py-32 relative">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-14 lg:mb-16" variants={fadeUp}>
            <p className="text-[#D4A853] text-xs font-semibold uppercase tracking-[0.24em] mb-4">{tx('testLabel')}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.1] max-w-3xl mx-auto" style={{ fontFamily: HEAD_FONT, letterSpacing: '-0.02em' }}>{tx('testTitle')}</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name: tx('test1Name'), role: tx('test1Role'), quote: tx('test1Quote') },
              { name: tx('test2Name'), role: tx('test2Role'), quote: tx('test2Quote') },
              { name: tx('test3Name'), role: tx('test3Role'), quote: tx('test3Quote') },
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
                  className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] rounded-2xl p-7 hover:border-[#D4A853]/25 transition-colors duration-300"
                >
                  {/* Gold stars */}
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <svg key={j} className="w-4 h-4 text-[#D4A853]" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-white/80 text-[15px] leading-relaxed mb-6">"{t.quote}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E8C97A]/40 to-[#D4A853]/15 border border-[#D4A853]/25 flex items-center justify-center text-[#E8C97A] font-bold text-sm" style={{ fontFamily: HEAD_FONT }}>
                      {t.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm tracking-tight">{t.name}</p>
                      <p className="text-white/45 text-xs">{t.role}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </Section>

      {/* ════════ FINAL CTA — Gold gradient block with deep glow ════════ */}
      <Section className="py-20 sm:py-24 lg:py-32 relative">
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            className="relative rounded-3xl border border-[#D4A853]/20 bg-gradient-to-br from-[#D4A853]/[0.1] via-[#0A0E27] to-[#0A0E27] overflow-hidden"
          >
            {/* Glow orb */}
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#D4A853]/25 rounded-full blur-[120px] pointer-events-none" />
            {/* Grid pattern */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }} />

            <div className="relative p-10 sm:p-14 lg:p-20 text-center">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-5 leading-[1.1]" style={{ fontFamily: HEAD_FONT, letterSpacing: '-0.02em' }}>
                {tx('ctaTitle')}
              </h2>
              <p className="text-white/60 max-w-xl mx-auto mb-9 leading-relaxed text-base sm:text-lg">
                {tx('ctaSub')}
              </p>
              <GoldButton onClick={() => navigate('/signup')} size="lg">
                {tx('getStarted')}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d={isRTL ? 'M12 5l-7 7 7 7' : 'M12 5l7 7-7 7'} />
                </svg>
              </GoldButton>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ════════ FOOTER — Minimal dark ════════ */}
      <footer id="footer" className="relative border-t border-white/[0.06] py-10 sm:py-12">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo & tagline */}
            <div className="text-center md:text-start">
              <div className="flex items-center gap-2.5 justify-center md:justify-start">
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-gradient-to-br from-[#E8C97A] to-[#D4A853]">
                  <BuildingIcon className="w-4 h-4 text-[#0A0E27]" />
                </div>
                <span className="text-base font-bold tracking-tight text-white" style={{ fontFamily: HEAD_FONT }}>Bait to Maintain</span>
              </div>
              <p className="text-white/40 text-xs mt-2">{tx('footerTagline')}</p>
            </div>

            {/* Links */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              {[
                { label: tx('navFeatures'), action: () => scrollTo('features') },
                { label: tx('navSecurity'), action: () => scrollTo('security') },
                { label: tx('footerTerms'), action: null },
                { label: tx('navContact'), action: () => scrollTo('footer') },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action || undefined}
                  className="cursor-pointer text-white/50 hover:text-white transition-colors duration-200"
                >
                  {item.label}
                </button>
              ))}
              <Link
                to="/privacy"
                className="text-white/50 hover:text-white transition-colors duration-200"
              >
                {tx('footerPrivacy')}
              </Link>
            </div>

            {/* Copyright */}
            <p className="text-white/30 text-xs text-center md:text-end">
              &copy; {new Date().getFullYear()} Bait to Maintain. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
