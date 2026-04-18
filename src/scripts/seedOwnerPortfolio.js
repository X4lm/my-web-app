/**
 * Dev-only seed script — populates the signed-in owner's Firestore tree
 * with 10 fully-populated properties, their subcollections, and invites
 * different managers to each. Run from the browser console while signed
 * in as an owner:
 *
 *     import('/src/scripts/seedOwnerPortfolio.js').then(m => m.seed())
 *
 * Safe to re-run (uses addDoc, so re-runs create extra docs — don't run
 * twice unless you want duplicates). Relies on window.__db / window.__auth
 * which main.jsx exposes in dev mode.
 */
import {
  collection, doc, addDoc, setDoc, serverTimestamp, writeBatch,
} from 'firebase/firestore'

const ISO = (d) => d.toISOString().slice(0, 10)
const daysFromNow = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ISO(d) }
const now = () => new Date().toISOString()

// ─── 10 properties spanning type + emirate + condition ───────────────────
const PROPERTIES = [
  {
    name: 'Marina Pearl Tower',
    address: 'Dubai Marina, JBR Walk, Dubai',
    type: 'residential_building',
    status: 'occupied',
    rentAmount: 480000,
    yearBuilt: 2019,
    totalArea: 8200,
    marketValue: 38000000,
    titleDeedNumber: 'TD-DXB-2019-01124',
    insuranceExpiry: daysFromNow(-10),           // 10d OVERDUE
    municipalityPermitExpiry: daysFromNow(55),   // upcoming
    assignTo: 'testpm99@test.com',
    units: 3,
  },
  {
    name: 'Al Barsha Office Hub',
    address: 'Al Barsha 1, Sheikh Zayed Road, Dubai',
    type: 'commercial_building',
    status: 'occupied',
    rentAmount: 720000,
    yearBuilt: 2017,
    totalArea: 14500,
    marketValue: 62000000,
    titleDeedNumber: 'TD-DXB-2017-00889',
    insuranceExpiry: daysFromNow(120),
    municipalityPermitExpiry: daysFromNow(25),   // upcoming
    assignTo: 'newpm2025@test.com',
    units: 2,
  },
  {
    name: 'Emirates Hills Villa 42',
    address: 'Emirates Hills, Street 12, Dubai',
    type: 'villa',
    status: 'occupied',
    rentAmount: 650000,
    yearBuilt: 2015,
    totalArea: 900,
    marketValue: 18500000,
    titleDeedNumber: 'TD-DXB-2015-05512',
    insuranceExpiry: daysFromNow(-45),           // OVERDUE (expired 45d ago)
    municipalityPermitExpiry: daysFromNow(180),
    assignTo: 'testpm99@test.com',
  },
  {
    name: 'Saadiyat Beach Villa 8',
    address: 'Saadiyat Island, Abu Dhabi',
    type: 'villa',
    status: 'occupied',
    rentAmount: 520000,
    yearBuilt: 2018,
    totalArea: 750,
    marketValue: 14500000,
    titleDeedNumber: 'TD-AUH-2018-00213',
    insuranceExpiry: daysFromNow(28),            // upcoming
    municipalityPermitExpiry: daysFromNow(240),
    assignTo: 'newpm2025@test.com',
  },
  {
    name: 'Al Reem Sky Residence',
    address: 'Al Reem Island, Shams Tower, Abu Dhabi',
    type: 'residential_building',
    status: 'occupied',
    rentAmount: 560000,
    yearBuilt: 2020,
    totalArea: 9600,
    marketValue: 44000000,
    titleDeedNumber: 'TD-AUH-2020-00745',
    insuranceExpiry: daysFromNow(80),
    municipalityPermitExpiry: daysFromNow(12),   // upcoming (tight)
    assignTo: 'testpm99@test.com',
    units: 3,
  },
  {
    name: 'Al Majaz Business Plaza',
    address: 'Al Majaz Waterfront, Sharjah',
    type: 'commercial_building',
    status: 'occupied',
    rentAmount: 380000,
    yearBuilt: 2016,
    totalArea: 6800,
    marketValue: 28000000,
    titleDeedNumber: 'TD-SHJ-2016-00341',
    insuranceExpiry: daysFromNow(-3),            // just overdue
    municipalityPermitExpiry: daysFromNow(60),
    assignTo: 'newpm2025@test.com',
    units: 2,
  },
  {
    name: 'Aljada Townhouse 17',
    address: 'Aljada, Muwaileh, Sharjah',
    type: 'townhouse',
    status: 'occupied',
    rentAmount: 180000,
    yearBuilt: 2021,
    totalArea: 320,
    marketValue: 4200000,
    titleDeedNumber: 'TD-SHJ-2021-01028',
    insuranceExpiry: daysFromNow(95),
    municipalityPermitExpiry: daysFromNow(150),
    assignTo: 'testpm99@test.com',
  },
  {
    name: 'Ajman Corniche Apartment 1204',
    address: 'Ajman Corniche Road, Ajman',
    type: 'apartment',
    status: 'available',
    rentAmount: 85000,
    yearBuilt: 2019,
    totalArea: 140,
    marketValue: 1400000,
    titleDeedNumber: 'TD-AJM-2019-00456',
    insuranceExpiry: daysFromNow(45),
    municipalityPermitExpiry: daysFromNow(90),
    assignTo: 'newpm2025@test.com',
  },
  {
    name: 'Al Hamra Beach Villa 3',
    address: 'Al Hamra Village, Ras Al Khaimah',
    type: 'villa',
    status: 'occupied',
    rentAmount: 220000,
    yearBuilt: 2017,
    totalArea: 520,
    marketValue: 6500000,
    titleDeedNumber: 'TD-RAK-2017-00087',
    insuranceExpiry: daysFromNow(-20),           // OVERDUE
    municipalityPermitExpiry: daysFromNow(300),
    assignTo: 'testpm99@test.com',
  },
  {
    name: 'Fujairah Industrial Warehouse F2',
    address: 'Fujairah Free Zone, Block F, Fujairah',
    type: 'warehouse',
    status: 'occupied',
    rentAmount: 260000,
    yearBuilt: 2014,
    totalArea: 3800,
    marketValue: 8200000,
    titleDeedNumber: 'TD-FJR-2014-00042',
    insuranceExpiry: daysFromNow(5),             // critical (5d to expire)
    municipalityPermitExpiry: daysFromNow(35),
    assignTo: 'newpm2025@test.com',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────
const TENANT_NAMES = [
  ['Mohammed Al Hosani',   '+971 50 1234567', 'mohammed.h@example.ae', '784-2024-1234567-1'],
  ['Fatima Al Shamsi',     '+971 52 2345678', 'fatima.s@example.ae',   '784-2024-2345678-2'],
  ['Omar Al Qasimi',       '+971 55 3456789', 'omar.q@example.ae',     '784-2024-3456789-3'],
  ['Aisha Al Mansouri',    '+971 56 4567890', 'aisha.m@example.ae',    '784-2024-4567890-4'],
  ['Khalid Al Suwaidi',    '+971 50 5678901', 'khalid.s@example.ae',   '784-2024-5678901-5'],
  ['Noura Al Zaabi',       '+971 52 6789012', 'noura.z@example.ae',    '784-2024-6789012-6'],
  ['Sultan Al Dhaheri',    '+971 55 7890123', 'sultan.d@example.ae',   '784-2024-7890123-7'],
  ['Mariam Al Nuaimi',     '+971 56 8901234', 'mariam.n@example.ae',   '784-2024-8901234-8'],
  ['Ahmed Al Kaabi',       '+971 50 9012345', 'ahmed.k@example.ae',    '784-2024-9012345-9'],
  ['Sara Al Falasi',       '+971 52 0123456', 'sara.f@example.ae',     '784-2024-0123456-0'],
  ['Yousef Al Romaithi',   '+971 55 1122334', 'yousef.r@example.ae',   '784-2024-1122334-1'],
  ['Hessa Al Mazrouei',    '+971 56 2233445', 'hessa.m@example.ae',    '784-2024-2233445-2'],
]

function maintenanceDoc(propertyStart) {
  // Full data across all 10 systems
  return {
    water: {
      tankCapacity: 8000,
      lastCleaning: daysFromNow(-60),
      nextCleaning: daysFromNow(30),
      waterPumpLastService: daysFromNow(-45),
    },
    ac: {
      brand: 'Daikin',
      model: 'FTXS-50KVMA',
      installationDate: daysFromNow(-900),
      lastServiceDate: daysFromNow(-90),
      lastFilterReplacement: daysFromNow(-45),
      gasRefillDate: daysFromNow(-180),
      condition: 'good',
      nextServiceDue: daysFromNow(-5),  // OVERDUE
    },
    electrical: {
      lastInspection: daysFromNow(-120),
      panelCondition: 'good',
      nextInspectionDue: daysFromNow(245),
      openIssues: 'None reported',
    },
    plumbing: {
      lastInspection: daysFromNow(-75),
      knownIssues: 'Minor kitchen sink drip — monitoring',
      lastMajorRepair: daysFromNow(-400),
    },
    elevator: {
      lastService: daysFromNow(-30),
      provider: 'KONE Middle East',
      nextServiceDue: daysFromNow(60),
      certificateExpiry: daysFromNow(180),
      condition: 'good',
    },
    generator: {
      capacity: 250,
      lastService: daysFromNow(-90),
      fuelType: 'Diesel',
      lastRefill: daysFromNow(-14),
      batteryCondition: 'good',
    },
    fireSafety: {
      extinguisherLastInspection: daysFromNow(-270),
      smokeDetectorsStatus: 'all_working',
      suppressionLastTest: daysFromNow(-360),
      certificateExpiry: daysFromNow(10),  // upcoming (critical)
    },
    roof: {
      lastInspection: daysFromNow(-160),
      waterproofingLastDone: daysFromNow(-700),
      condition: 'good',
    },
    pestControl: {
      lastService: daysFromNow(-45),
      provider: 'Rentokil UAE',
      nextServiceDue: daysFromNow(45),
      treatmentAreas: 'Common areas, basement, rooftop',
    },
    commonAreas: {
      lobbySuspendedCeiling: 'good',
      lobbyCeiling: 'good',
      elevatorInterior: 'good',
    },
  }
}

function makeCheques(propIndex, tenantIndex) {
  // Mix across -180 to +120 days with varied statuses
  const patterns = [
    { offset: -150, status: 'cleared',  amount: 40000, num: '000101' },
    { offset: -120, status: 'cleared',  amount: 40000, num: '000102' },
    { offset:  -90, status: 'cleared',  amount: 40000, num: '000103' },
    { offset:  -60, status: 'bounced',  amount: 40000, num: '000104' },
    { offset:  -30, status: 'cleared',  amount: 40000, num: '000105' },
    { offset:   -5, status: 'pending',  amount: 40000, num: '000106' },  // overdue
    { offset:   25, status: 'pending',  amount: 40000, num: '000107' },
    { offset:   55, status: 'pending',  amount: 40000, num: '000108' },
  ]
  const banks = ['Emirates NBD', 'FAB', 'ADCB', 'Mashreq Bank', 'RAK Bank']
  return patterns.map(p => ({
    date: daysFromNow(p.offset),
    amount: p.amount + propIndex * 500,
    status: p.status,
    chequeNumber: p.num,
    bankName: banks[(propIndex + tenantIndex) % banks.length],
  }))
}

function makeExpenses(propIndex) {
  const today = new Date()
  const items = [
    { catagory: 'utilities',   description: 'DEWA monthly bill',             cost: 4200 + propIndex*80,  offset: -5   },
    { catagory: 'utilities',   description: 'DEWA monthly bill',             cost: 4100 + propIndex*80,  offset: -35  },
    { catagory: 'utilities',   description: 'Etisalat internet',             cost: 890,                  offset: -15  },
    { catagory: 'cleaning',    description: 'Monthly common-area cleaning',  cost: 2200,                 offset: -20  },
    { catagory: 'cleaning',    description: 'Monthly common-area cleaning',  cost: 2200,                 offset: -50  },
    { catagory: 'maintenance', description: 'AC filter replacement',         cost: 1500,                 offset: -25  },
    { catagory: 'maintenance', description: 'Plumbing leak repair',          cost: 950,                  offset: -45  },
    { catagory: 'maintenance', description: 'Emergency water-tank cleanup',  cost: 12500 + propIndex*200, offset: -3  },  // ANOMALY (normally ~1500)
    { catagory: 'insurance',   description: 'Annual property insurance',     cost: 18500,                offset: -180 },
    { catagory: 'management',  description: 'Property-management retainer',  cost: 3500,                 offset: -30  },
    { catagory: 'management',  description: 'Property-management retainer',  cost: 3500,                 offset: -60  },
    { catagory: 'repair',      description: 'Door lock replacement',         cost: 650,                  offset: -40  },
  ]
  return items.map(i => ({
    date: daysFromNow(i.offset),
    category: i.catagory,
    cost: i.cost,
    description: i.description,
    notes: 'Paid via company card · reference in books',
  }))
}

function makeWorkOrders(propIndex, byName) {
  const items = [
    {
      title: 'Elevator making unusual noise on floor 5',
      description: 'Residents reported metallic grinding when elevator passes floor 5. Engineer callout required.',
      category: 'hvac',
      priority: 'high',
      status: 'in_progress',
      unitNumber: propIndex % 2 === 0 ? '501' : '305',
      assignedVendor: 'KONE Middle East',
      estimatedCost: 4500,
      reportedBy: 'Security staff — night shift',
      dueDate: daysFromNow(-2),
    },
    {
      title: 'Water leak under kitchen sink',
      description: 'Small but persistent leak forming puddle. Cabinet base starting to swell.',
      category: 'plumbing',
      priority: 'medium',
      status: 'completed',
      unitNumber: '204',
      assignedVendor: 'Al Nahdi Plumbing',
      estimatedCost: 950,
      reportedBy: 'Tenant — Fatima Al Shamsi',
      dueDate: daysFromNow(-15),
    },
    {
      title: 'Lobby lighting flickering',
      description: 'Main lobby ceiling lights flicker intermittently after 8 PM. Likely ballast issue.',
      category: 'electrical',
      priority: 'low',
      status: 'open',
      unitNumber: '',
      assignedVendor: '',
      estimatedCost: 800,
      reportedBy: 'Property manager on round',
      dueDate: daysFromNow(14),
    },
    {
      title: 'Fire extinguisher annual inspection',
      description: 'Scheduled annual inspection of all fire extinguishers and alarm panel.',
      category: 'general',
      priority: 'urgent',
      status: 'open',
      unitNumber: '',
      assignedVendor: 'Al Salama Fire Safety',
      estimatedCost: 2800,
      reportedBy: 'Compliance reminder',
      dueDate: daysFromNow(3),
    },
  ]
  return items.map(it => {
    const seed = { from: null, to: it.status, at: now(), by: byName }
    return { ...it, statusHistory: [seed] }
  })
}

function makeDocuments(propIndex) {
  return [
    { name: 'Title Deed',           category: 'title_deed',          expiryDate: null,              notes: 'Original deed' },
    { name: 'Property Insurance',   category: 'insurance',           expiryDate: daysFromNow(propIndex % 3 === 0 ? -30 : 45), notes: 'AXA policy' },
    { name: 'Municipality Permit',  category: 'municipality_permit', expiryDate: daysFromNow(60 + propIndex * 5), notes: '' },
    { name: 'NOC — Common Area',    category: 'noc',                 expiryDate: daysFromNow(365),  notes: 'From developer' },
    { name: 'DEWA Account',         category: 'dewa',                expiryDate: null,              notes: 'Main meter' },
    { name: 'Fire Safety Cert',     category: 'inspection_report',   expiryDate: daysFromNow(10),   notes: 'Critical' },
    { name: 'Trade License',        category: 'trade_license',       expiryDate: daysFromNow(propIndex % 4 === 0 ? -5 : 120), notes: 'For commercial' },
  ]
}

function makeUnit(propIndex, unitIndex, totalUnits) {
  const [name, phone, email, eid] = TENANT_NAMES[(propIndex * 3 + unitIndex) % TENANT_NAMES.length]
  const floor = Math.floor(unitIndex / 4) + 1
  const unitNum = `${floor}0${(unitIndex % 4) + 1}`
  const occupied = unitIndex < Math.min(totalUnits, 3) // first few occupied, rest vacant
  return {
    unitNumber: unitNum,
    floor: String(floor),
    size: 100 + unitIndex * 20,
    unitType: unitIndex % 3 === 0 ? '1br' : unitIndex % 3 === 1 ? '2br' : '3br',
    condition: 'good',
    status: occupied ? 'occupied' : 'vacant',
    tenantName: occupied ? name : '',
    tenantContact: occupied ? phone : '',
    tenantEmail: occupied ? email : '',
    emiratesId: occupied ? eid : '',
    nationality: occupied ? 'UAE' : '',
    employer: occupied ? 'Emirates Group' : '',
    emergencyName: occupied ? 'Ali Al Hosani' : '',
    emergencyPhone: occupied ? '+971 50 9999999' : '',
    leaseStart: occupied ? daysFromNow(-120) : '',
    leaseEnd: occupied ? daysFromNow(unitIndex === 0 ? 20 : 245) : '',   // one expiring soon
    ejariNumber: occupied ? `EJR-2025-DUB-${String(1000 + propIndex*100 + unitIndex).padStart(5, '0')}` : '',
    contractNumber: occupied ? `CN-2025-${unitNum}` : '',
    paymentFrequency: 'monthly',
    annualRent: occupied ? (90000 + unitIndex * 10000) : 0,
    monthlyRent: occupied ? (7500 + unitIndex * 850) : 0,
    paymentStatus: occupied ? (unitIndex === 0 ? 'overdue' : 'paid') : 'pending',
    securityDeposit: occupied ? (7500 + unitIndex * 850) : 0,
  }
}

export async function seed() {
  const db = window.__db
  const auth = window.__auth
  if (!db || !auth) throw new Error('Dev globals missing — rebuild and reload.')
  const user = auth.currentUser
  if (!user) throw new Error('Sign in as owner first.')
  const uid = user.uid
  const ownerName = user.displayName || user.email

  const log = (...a) => console.log('[seed]', ...a)
  const created = []

  for (let i = 0; i < PROPERTIES.length; i++) {
    const p = PROPERTIES[i]
    log(`(${i+1}/10) ${p.name}`)

    // Create property doc
    const propRef = await addDoc(collection(db, 'users', uid, 'properties'), {
      name: p.name, address: p.address, type: p.type, status: p.status,
      rentAmount: p.rentAmount, yearBuilt: p.yearBuilt,
      totalArea: p.totalArea, marketValue: p.marketValue,
      titleDeedNumber: p.titleDeedNumber,
      insuranceExpiry: p.insuranceExpiry,
      municipalityPermitExpiry: p.municipalityPermitExpiry,
      createdAt: serverTimestamp(), createdBy: ownerName,
    })
    const pid = propRef.id
    const basePath = ['users', uid, 'properties', pid]

    // Property index (for linked-user lookup)
    await setDoc(doc(db, 'propertyIndex', pid), {
      ownerUid: uid, name: p.name,
    })

    // Units — only for multi-unit types
    const unitCount = p.units || 0
    const firstUnit = unitCount > 0 ? makeUnit(i, 0, unitCount) : null
    for (let u = 0; u < unitCount; u++) {
      const unitData = makeUnit(i, u, unitCount)
      await addDoc(collection(db, ...basePath, 'units'), {
        ...unitData, createdAt: serverTimestamp(),
      })
    }

    // Maintenance (single doc)
    await setDoc(doc(db, ...basePath, 'maintenance', 'data'), maintenanceDoc(p))

    // Cheques — batch
    const chequeBatch = writeBatch(db)
    makeCheques(i, 0).forEach(c => {
      chequeBatch.set(doc(collection(db, ...basePath, 'cheques')), {
        ...c, createdAt: serverTimestamp(),
      })
    })
    await chequeBatch.commit()

    // Expenses — batch
    const expenseBatch = writeBatch(db)
    makeExpenses(i).forEach(e => {
      expenseBatch.set(doc(collection(db, ...basePath, 'expenses')), {
        ...e, createdAt: serverTimestamp(),
      })
    })
    await expenseBatch.commit()

    // Work orders
    for (const wo of makeWorkOrders(i, ownerName)) {
      await addDoc(collection(db, ...basePath, 'workOrders'), {
        ...wo, createdAt: serverTimestamp(),
      })
    }

    // Documents
    for (const d of makeDocuments(i)) {
      await addDoc(collection(db, ...basePath, 'documents'), {
        ...d, createdAt: serverTimestamp(), fileUrl: '',
      })
    }

    // Invitation: assign to the designated PM
    await addDoc(collection(db, 'invitations'), {
      inviterUid: uid,
      inviterName: ownerName,
      inviteeEmail: p.assignTo.toLowerCase(),
      propertyId: pid,
      propertyName: p.name,
      unitId: null,
      unitNumber: null,
      role: 'property_manager',
      status: 'pending',
      createdAt: serverTimestamp(),
      acceptedAt: null,
      declinedAt: null,
    })

    created.push({ name: p.name, id: pid, assignedTo: p.assignTo })
  }

  log('DONE — 10 properties created.')
  console.table(created)
  return created
}
