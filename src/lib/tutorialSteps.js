/**
 * Tutorial step definitions per page. Exported as a factory so pages can
 * pass in the `t` function from LocaleContext and get localized copy.
 * Targets use CSS selectors against data-tour attributes on the rendered DOM.
 */
export function getSteps(t) {
  return {
    // Dashboard tour follows a clean spatial flow:
    //   sidebar (Today, Atlas) → main content (KPI cards) → header (Search, Tutorial toggle)
    // Left column first, then center, then top-right — no zigzag.
    dashboard: [
      { target: '[data-tour="sidebar-priority"]',  title: t('tut.dash.today.title'),   body: t('tut.dash.today.body'),   placement: 'right' },
      { target: '[data-tour="sidebar-atlas"]',     title: t('tut.dash.atlas.title'),   body: t('tut.dash.atlas.body'),   placement: 'right' },
      { target: '[data-tour="dashboard-kpi"]',     title: t('tut.dash.kpi.title'),     body: t('tut.dash.kpi.body'),     placement: 'bottom' },
      { target: '[data-tour="header-cmdk"]',       title: t('tut.dash.cmdk.title'),    body: t('tut.dash.cmdk.body'),    placement: 'bottom' },
      { target: '[data-tour="header-tutorial"]',   title: t('tut.dash.replay.title'),  body: t('tut.dash.replay.body'),  placement: 'bottom' },
    ],
    priority: [
      { target: '[data-tour="priority-header"]',   title: t('tut.prio.header.title'),  body: t('tut.prio.header.body'),  placement: 'bottom' },
      { target: '[data-tour="priority-filters"]',  title: t('tut.prio.filters.title'), body: t('tut.prio.filters.body'), placement: 'bottom' },
      { target: '[data-tour="priority-list"]',     title: t('tut.prio.list.title'),    body: t('tut.prio.list.body'),    placement: 'top'    },
    ],
    // Properties tour: walk the top bar first (search + add), then drop
    // down to the table for the health-score column. Avoids jumping from
    // top → table → top.
    properties: [
      { target: '[data-tour="properties-search"]', title: t('tut.props.search.title'), body: t('tut.props.search.body'), placement: 'bottom' },
      { target: '[data-tour="properties-add"]',    title: t('tut.props.add.title'),    body: t('tut.props.add.body'),    placement: 'bottom' },
      { target: '[data-tour="properties-health"]', title: t('tut.props.health.title'), body: t('tut.props.health.body'), placement: 'right'  },
    ],
    atlas: [
      { target: '[data-tour="atlas-groups"]',      title: t('tut.atlas.groups.title'), body: t('tut.atlas.groups.body'), placement: 'bottom' },
      { target: '[data-tour="atlas-card"]',        title: t('tut.atlas.card.title'),   body: t('tut.atlas.card.body'),   placement: 'top'    },
    ],
    property_detail: [
      { target: '[data-tour="pd-tabs"]',           title: t('tut.pd.tabs.title'),      body: t('tut.pd.tabs.body'),      placement: 'bottom' },
      { target: '[data-tour="pd-overview-docs"]',  title: t('tut.pd.docs.title'),      body: t('tut.pd.docs.body'),      placement: 'top'    },
    ],
  }
}

// Back-compat: expose STEPS as a getter that returns English strings via a
// pass-through t. Pages that were written against the static STEPS export
// continue to work until they switch to getSteps(t).
const passThrough = (key) => key
export const STEPS = getSteps(passThrough)
