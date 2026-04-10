// Each section defines its fields. Field types: text, number, date, select, textarea
// Fields with `alertField: true` and `alertType: 'date'` will be checked for overdue/upcoming alerts.

export const MAINTENANCE_SECTIONS = [
  {
    key: 'water',
    label: 'Water System',
    icon: 'Droplets',
    fields: [
      { key: 'tankCapacity', label: 'Tank capacity (liters)', type: 'number' },
      { key: 'lastCleaning', label: 'Last cleaning date', type: 'date' },
      { key: 'nextCleaning', label: 'Next scheduled cleaning', type: 'date', alertField: true },
      { key: 'waterPumpLastService', label: 'Water pump last service', type: 'date' },
    ],
  },
  {
    key: 'ac',
    label: 'AC System',
    icon: 'Snowflake',
    fields: [
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'model', label: 'Model', type: 'text' },
      { key: 'installationDate', label: 'Installation date', type: 'date' },
      { key: 'lastServiceDate', label: 'Last service date', type: 'date' },
      { key: 'lastFilterReplacement', label: 'Last filter replacement', type: 'date' },
      { key: 'gasRefillDate', label: 'Gas refill date', type: 'date' },
      { key: 'condition', label: 'Condition', type: 'select', options: ['Good', 'Needs Service', 'Replace'] },
      { key: 'nextServiceDue', label: 'Next service due', type: 'date', alertField: true },
    ],
  },
  {
    key: 'electrical',
    label: 'Electrical',
    icon: 'Zap',
    fields: [
      { key: 'lastInspection', label: 'Last inspection date', type: 'date' },
      { key: 'panelCondition', label: 'Panel condition', type: 'select', options: ['Good', 'Needs Attention', 'Critical'] },
      { key: 'nextInspectionDue', label: 'Next inspection due', type: 'date', alertField: true },
      { key: 'openIssues', label: 'Open issues', type: 'textarea' },
    ],
  },
  {
    key: 'plumbing',
    label: 'Plumbing',
    icon: 'Wrench',
    fields: [
      { key: 'lastInspection', label: 'Last inspection', type: 'date' },
      { key: 'knownIssues', label: 'Known issues', type: 'textarea' },
      { key: 'lastMajorRepair', label: 'Last major repair', type: 'date' },
    ],
  },
  {
    key: 'elevator',
    label: 'Elevator',
    icon: 'ArrowUpDown',
    optional: true,
    fields: [
      { key: 'lastService', label: 'Last service', type: 'date' },
      { key: 'provider', label: 'Service provider', type: 'text' },
      { key: 'nextServiceDue', label: 'Next service due', type: 'date', alertField: true },
      { key: 'certificateExpiry', label: 'Certificate expiry', type: 'date', alertField: true },
      { key: 'condition', label: 'Condition', type: 'select', options: ['Good', 'Needs Service', 'Replace'] },
    ],
  },
  {
    key: 'generator',
    label: 'Generator',
    icon: 'Power',
    optional: true,
    fields: [
      { key: 'capacity', label: 'Capacity (kW)', type: 'number' },
      { key: 'lastService', label: 'Last service', type: 'date' },
      { key: 'fuelType', label: 'Fuel type', type: 'select', options: ['Diesel', 'Gasoline', 'Natural Gas'] },
      { key: 'lastRefill', label: 'Last refill', type: 'date' },
      { key: 'batteryCondition', label: 'Battery condition', type: 'select', options: ['Good', 'Needs Replacement', 'Dead'] },
    ],
  },
  {
    key: 'fireSafety',
    label: 'Fire Safety',
    icon: 'Flame',
    fields: [
      { key: 'extinguisherLastInspection', label: 'Extinguisher last inspection', type: 'date' },
      { key: 'smokeDetectorsStatus', label: 'Smoke detectors status', type: 'select', options: ['All Working', 'Some Faulty', 'Not Installed'] },
      { key: 'suppressionLastTest', label: 'Suppression system last test', type: 'date' },
      { key: 'certificateExpiry', label: 'Certificate expiry', type: 'date', alertField: true },
    ],
  },
  {
    key: 'roof',
    label: 'Roof',
    icon: 'Home',
    fields: [
      { key: 'lastInspection', label: 'Last inspection', type: 'date' },
      { key: 'waterproofingLastDone', label: 'Waterproofing last done', type: 'date' },
      { key: 'condition', label: 'Condition', type: 'select', options: ['Good', 'Needs Attention', 'Critical'] },
    ],
  },
  {
    key: 'pestControl',
    label: 'Pest Control',
    icon: 'Bug',
    fields: [
      { key: 'lastTreatment', label: 'Last treatment', type: 'date' },
      { key: 'treatmentType', label: 'Treatment type', type: 'text' },
      { key: 'nextScheduled', label: 'Next scheduled', type: 'date', alertField: true },
    ],
  },
  {
    key: 'commonAreas',
    label: 'Common Areas',
    icon: 'Users',
    fields: [
      { key: 'lobbyCondition', label: 'Lobby condition', type: 'select', options: ['Good', 'Needs Attention', 'Critical'] },
      { key: 'corridorsCondition', label: 'Corridors condition', type: 'select', options: ['Good', 'Needs Attention', 'Critical'] },
      { key: 'lastDeepCleaning', label: 'Last deep cleaning', type: 'date' },
    ],
  },
  {
    key: 'poolGym',
    label: 'Pool / Gym',
    icon: 'Dumbbell',
    optional: true,
    fields: [
      { key: 'poolLastChemicalTreatment', label: 'Pool last chemical treatment', type: 'date' },
      { key: 'poolFilterCleaned', label: 'Pool filter cleaned', type: 'date' },
      { key: 'gymEquipmentLastServiced', label: 'Gym equipment last serviced', type: 'date' },
    ],
  },
  {
    key: 'parking',
    label: 'Parking',
    icon: 'Car',
    fields: [
      { key: 'totalSpots', label: 'Total spots', type: 'number' },
      { key: 'assignedPerUnit', label: 'Assigned per unit', type: 'number' },
      { key: 'visitorSpots', label: 'Visitor spots', type: 'number' },
    ],
  },
]

// Helper to check alerts from maintenance data
export function getMaintenanceAlerts(maintenanceData) {
  const alerts = []
  const now = new Date()
  const thirtyDays = 30 * 24 * 60 * 60 * 1000

  for (const section of MAINTENANCE_SECTIONS) {
    const sectionData = maintenanceData?.[section.key]
    if (!sectionData) continue

    for (const field of section.fields) {
      if (!field.alertField || field.type !== 'date') continue
      const dateVal = sectionData[field.key]
      if (!dateVal) continue

      const date = new Date(dateVal)
      const diff = date.getTime() - now.getTime()

      if (diff < 0) {
        alerts.push({
          level: 'overdue',
          section: section.label,
          field: field.label,
          date: dateVal,
          sectionKey: section.key,
        })
      } else if (diff < thirtyDays) {
        alerts.push({
          level: 'upcoming',
          section: section.label,
          field: field.label,
          date: dateVal,
          sectionKey: section.key,
        })
      }
    }
  }

  return alerts
}
