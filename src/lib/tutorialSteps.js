/**
 * Tutorial step definitions per page. Each page imports STEPS[pageKey]
 * and passes it to useTutorial(pageKey, steps). Targets use CSS selectors
 * against data-tour attributes (or existing ids) on the rendered DOM.
 */
export const STEPS = {
  dashboard: [
    {
      target: '[data-tour="dashboard-kpi"]',
      title: 'Your portfolio at a glance',
      body: 'The four cards up top show your total properties, what\'s available to rent, what\'s occupied, and your monthly income.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="sidebar-today"]',
      title: 'Today — your priority list',
      body: 'Every overdue maintenance, rent that\'s late, lease expiring, or document about to lapse — in one ranked list.',
      placement: 'right',
    },
    {
      target: '[data-tour="sidebar-atlas"]',
      title: 'Atlas — the geographical view',
      body: 'See your properties grouped by emirate, with a health score and alert count per property.',
      placement: 'right',
    },
    {
      target: '[data-tour="header-cmdk"]',
      title: 'Jump anywhere fast',
      body: 'Press ⌘K (or Ctrl+K) from anywhere to search pages, properties, or tenants.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="header-tutorial"]',
      title: 'Replay this tutorial anytime',
      body: 'Toggle the hat icon to turn the tutorial on again — it\'ll play fresh on every page.',
      placement: 'bottom',
    },
  ],

  priority: [
    {
      target: '[data-tour="priority-header"]',
      title: 'Your action list for today',
      body: 'Items are grouped by urgency: Overdue, this week, next 30 days, and later.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="priority-filters"]',
      title: 'Filter by kind',
      body: 'Cheques, Maintenance, Leases, Documents, Work orders — show only what you want to focus on.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="priority-list"]',
      title: 'Click anything to fix it',
      body: 'Each row deep-links to the exact tab on the property where the field lives — no more hunting through tabs.',
      placement: 'top',
    },
  ],

  properties: [
    {
      target: '[data-tour="properties-search"]',
      title: 'Find a property fast',
      body: 'Search by name, address, or filter by status and type.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="properties-health"]',
      title: 'Health score at a glance',
      body: 'Every property gets a 0–100 score based on occupancy, on-time rent, maintenance compliance, and alerts. Red rings mean attention needed.',
      placement: 'right',
    },
    {
      target: '[data-tour="properties-add"]',
      title: 'Add a new property',
      body: 'Click here to add a villa, apartment, building, or commercial space to your portfolio.',
      placement: 'bottom',
    },
  ],

  atlas: [
    {
      target: '[data-tour="atlas-groups"]',
      title: 'Grouped by emirate',
      body: 'Properties cluster by emirate automatically from their address. Perfect for scattered UAE portfolios.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="atlas-card"]',
      title: 'Each card shows the essentials',
      body: 'Status pin, health score, unit count, and open alerts. Hover to see an Open-in-Maps link.',
      placement: 'top',
    },
  ],

  property_detail: [
    {
      target: '[data-tour="pd-tabs"]',
      title: 'Every aspect of the property',
      body: 'Overview, Units, Maintenance, Financials, Documents — plus more in the menu. Each tab is deep-linkable.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="pd-overview-docs"]',
      title: 'Expiry dates live here',
      body: 'Insurance and municipality permit show in red when overdue. Red dates also appear on your Today list and Alerts.',
      placement: 'top',
    },
  ],
}
