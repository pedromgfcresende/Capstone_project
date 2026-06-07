// Sector-level company relationship profiles, keyed by company id.
// The focus is the relationship layer — contacts and meeting-note history —
// with funding, team and metrics as supporting research context.

export const METRIC_LEVELS = {
  High:   { bg: '#d9ecdf', text: '#2d6a3f', dot: '#2d6a3f' },
  Medium: { bg: '#fbf3d9', text: '#9a7b1f', dot: '#d8b84a' },
  Low:    { bg: '#f0ede8', text: '#8a8580', dot: '#b8b2a8' },
}

export const companyProfiles = {
  'co-a': {
    totalRaised: '€7.2M',
    latestRound: { stage: 'Series A', amount: '€6M', date: 'Sep 2023', lead: 'Stride VC' },
    investors: ['Kima Ventures', 'Stride VC', 'XAnge', 'BPI France'],
    fundingHistory: [
      { date: 'Sep 2023', amount: '€6M', round: 'Series A', lead: 'Led by Stride VC', current: true },
      { date: 'Feb 2022', amount: '€1.2M', round: 'Seed', lead: 'Led by Kima Ventures' },
    ],
    team: [
      { name: 'Charles Desbrehard', role: 'CEO & Co-founder', bio: 'Ex-Spendesk (Head of Product). Led core product at Spendesk from Series A to Series B. Deep understanding of the CFO software buyer.' },
      { name: 'Mathieu Brouard', role: 'CTO & Co-founder', bio: 'Ex-Qonto (Engineering). Built payment infrastructure at Qonto. Hands-on technical background with deep expertise in French banking connectivity.' },
    ],
    metrics: {
      ARR: { value: '~€800K (inferred)', level: 'Low' },
      Customers: { value: '~40 companies', level: 'Medium' },
      Headcount: { value: '18 employees', level: 'High' },
      'Web traffic': { value: 'Low / early-stage', level: 'Low' },
    },
    contacts: [
      { id: 'k1', name: 'Charles Desbrehard', role: 'CEO & Co-founder', email: 'charles@payflows.io', note: 'Primary contact. Warm, responsive. Met at Station F.' },
      { id: 'k2', name: 'Mathieu Brouard', role: 'CTO & Co-founder', email: 'mathieu@payflows.io', note: 'Technical deep-dives. Prefers async.' },
    ],
    meetings: [
      { id: 'm1', date: '2025-03-14', time: '10:00', title: 'Follow-up call', attendees: 'Charles D. · John Doe (XAnge)', notes: 'Strong product velocity since last touch. Accountant-channel pilot live with 3 firms — early but promising. Sales org still 2 people; hiring an AE for DACH. Wants to keep XAnge warm for the Series B.' },
      { id: 'm2', date: '2025-01-22', time: '09:30', title: 'Station F coffee', attendees: 'Charles D., Mathieu B. · John Doe (XAnge)', notes: 'First proper meeting. Impressed by founder-market fit — both ex-Spendesk/Qonto. Unified AP/AR demo was sharp. Flagged Pennylane as the distribution threat. Agreed to reconnect after their next milestone.' },
    ],
  },
  'co-sm1': {
    totalRaised: '$430M',
    latestRound: { stage: 'Series C', amount: '$200M', date: 'Jul 2021', lead: 'Bain Capital Ventures' },
    investors: ['Bain Capital Ventures', 'Kinnevik', 'Creandum', 'Founders Fund'],
    fundingHistory: [
      { date: 'Jul 2021', amount: '$200M', round: 'Series C', lead: 'Led by Bain Capital Ventures', current: true },
      { date: 'Jun 2021', amount: '$150M', round: 'Series B extension', lead: 'Led by Bain Capital Ventures' },
    ],
    team: [
      { name: 'Jeppe Rindom', role: 'CEO & Co-founder', bio: 'Ex-Tradeshift CFO. Repeat fintech operator with a strong finance background.' },
    ],
    metrics: {
      ARR: { value: 'Not disclosed', level: 'Medium' },
      Customers: { value: '37,000+ companies', level: 'High' },
      Headcount: { value: '~1,000', level: 'High' },
      'Web traffic': { value: 'Strong / category leader', level: 'High' },
    },
    contacts: [
      { id: 'k1', name: 'Jeppe Rindom', role: 'CEO & Co-founder', email: 'jeppe@pleo.io', note: 'Met at Slush. Open to staying in touch as a category reference.' },
    ],
    meetings: [
      { id: 'm1', date: '2024-11-21', time: '14:00', title: 'Category catch-up', attendees: 'Jeppe R. · John Doe (XAnge)', notes: 'Late-stage, not a fit for us, but a useful read on the spend-management category. PLG motion still strong in the Nordics; international expansion slower than planned. AI controls are their next upgrade lever.' },
    ],
  },
  'co-el1': {
    totalRaised: '€169M',
    latestRound: { stage: 'Series A', amount: '€17M equity + debt', date: '2023', lead: 'Northzone' },
    investors: ['Northzone', 'Headline', 'Ribbit Capital'],
    fundingHistory: [
      { date: '2023', amount: '€17M', round: 'Series A', lead: 'Led by Northzone', current: true },
      { date: '2022', amount: '€10M', round: 'Seed', lead: 'Led by Headline' },
    ],
    team: [
      { name: 'Jordane Giuly', role: 'CEO & Co-founder', bio: 'Ex-Spendesk co-founder. Repeat founder in the European fintech ecosystem.' },
    ],
    metrics: {
      ARR: { value: 'Not disclosed', level: 'Low' },
      Customers: { value: 'B2B platforms', level: 'Medium' },
      Headcount: { value: '~40', level: 'Medium' },
      'Web traffic': { value: 'Early-stage', level: 'Low' },
    },
    contacts: [
      { id: 'k1', name: 'Jordane Giuly', role: 'CEO & Co-founder', email: 'jordane@defacto.com', note: 'Ex-Spendesk co-founder — strong network. Very responsive.' },
    ],
    meetings: [
      { id: 'm1', date: '2025-02-06', time: '16:30', title: 'Intro + underwriting deep-dive', attendees: 'Jordane G. · John Doe (XAnge)', notes: 'Real-time underwriting on banking + accounting data is the core wedge. Asset-light, embedded via API into platforms. Key question is how loss rates hold through the rate cycle. Flagged for Series A follow-up.' },
      { id: 'm2', date: '2024-12-03', time: '10:00', title: 'Warm intro call', attendees: 'Jordane G. · John Doe (XAnge)', notes: 'First contact via mutual at Spendesk. Strong founder-market fit. Embedded lending is early but the bank-retreat tailwind is real. Agreed to reconnect after their next data milestone.' },
    ],
  },
  'co-f': {
    totalRaised: '$100M+',
    latestRound: { stage: 'Series B', amount: '$73M', date: 'Jul 2024', lead: 'Coatue' },
    investors: ['Coatue', 'Balderton Capital', 'New Wave'],
    fundingHistory: [
      { date: 'Jul 2024', amount: '$73M', round: 'Series B', lead: 'Led by Coatue', current: true },
      { date: '2021', amount: '$22M', round: 'Series A', lead: 'Led by Balderton Capital' },
    ],
    team: [
      { name: 'Rachel Delacour', role: 'CEO & Co-founder', bio: 'Ex-Zendesk (via BIME acquisition). Repeat SaaS founder with a strong enterprise track record.' },
    ],
    metrics: {
      ARR: { value: 'Not disclosed', level: 'Medium' },
      Customers: { value: 'Large enterprises', level: 'High' },
      Headcount: { value: '~200', level: 'High' },
      'Web traffic': { value: 'Solid', level: 'Medium' },
    },
    contacts: [
      { id: 'k1', name: 'Rachel Delacour', role: 'CEO & Co-founder', email: 'rachel@sweep.net', note: 'Met at VivaTech. Strong enterprise vision.' },
    ],
    meetings: [
      { id: 'm1', date: '2024-10-12', time: '15:00', title: 'Series B debrief', attendees: 'Rachel D. · John Doe (XAnge)', notes: 'Walked through the Coatue round and US expansion plan. Verification moat is the core narrative. Keen to stay close.' },
    ],
  },
  'co-c': {
    totalRaised: '€100M+',
    latestRound: { stage: 'Series C', amount: '€75M', date: 'Apr 2025', lead: 'DST Global' },
    investors: ['DST Global', 'Sequoia Capital', 'Global Founders Capital'],
    fundingHistory: [
      { date: 'Apr 2025', amount: '€75M', round: 'Series C', lead: 'Led by DST Global', current: true },
      { date: '2022', amount: '€15M', round: 'Series B', lead: 'Led by Sequoia Capital' },
    ],
    team: [
      { name: 'Arthur Waller', role: 'CEO & Co-founder', bio: 'Repeat founder (sold Sponsorise.me). Built Pennylane around the accountant distribution channel.' },
    ],
    metrics: {
      ARR: { value: '~€40M (est.)', level: 'High' },
      Customers: { value: '350k+ SMBs', level: 'High' },
      Headcount: { value: '~550', level: 'High' },
      'Web traffic': { value: 'Strong', level: 'High' },
    },
    contacts: [
      { id: 'k1', name: 'Arthur Waller', role: 'CEO & Co-founder', email: 'arthur@pennylane.com', note: 'Competitive reference for the accountant channel. Friendly but guarded.' },
    ],
    meetings: [
      { id: 'm1', date: '2025-04-18', time: '11:30', title: 'Series C congrats call', attendees: 'Arthur W. · John Doe (XAnge)', notes: 'Discussed the DST round and accountant-channel economics. Useful benchmark for the Payflows thesis. Not raising again near-term.' },
    ],
  },
  'co-i': {
    totalRaised: '$240M',
    latestRound: { stage: 'Series B', amount: '$100M', date: 'Mar 2024', lead: 'Sprints Capital' },
    investors: ['Sprints Capital', 'Lightspeed', 'Greenoaks'],
    fundingHistory: [
      { date: 'Mar 2024', amount: '$100M', round: 'Series B', lead: 'Led by Sprints Capital', current: true },
      { date: '2022', amount: '$100M', round: 'Series A', lead: 'Led by Lightspeed' },
    ],
    team: [
      { name: 'Hristo Borisov', role: 'CEO & Co-founder', bio: 'Ex-Telerik. Engineering-led founder driving aggressive international expansion.' },
    ],
    metrics: {
      ARR: { value: 'Not disclosed', level: 'Medium' },
      Customers: { value: '32 countries', level: 'High' },
      Headcount: { value: '~400', level: 'High' },
      'Web traffic': { value: 'Growing', level: 'Medium' },
    },
    contacts: [
      { id: 'k1', name: 'Hristo Borisov', role: 'CEO & Co-founder', email: 'hristo@payhawk.com', note: 'Engineering-led, direct. Met remotely.' },
    ],
    meetings: [
      { id: 'm1', date: '2024-09-18', time: '13:00', title: 'Expansion review', attendees: 'Hristo B. · John Doe (XAnge)', notes: 'Fastest international footprint in the category (32 countries) but burn is high — raised at an aggressive multiple. Watching execution risk closely. Too late-stage for us, useful competitive benchmark for the segment.' },
    ],
  },
}

// Merge a company's base record with any rich profile, with safe fallbacks.
export function getProfile(company) {
  const p = companyProfiles[company.id] || {}
  return {
    totalRaised: p.totalRaised || null,
    latestRound: p.latestRound || (company.fundRound ? { stage: company.fundRound, amount: null, date: null, lead: null } : null),
    investors: p.investors || [],
    fundingHistory: p.fundingHistory || [],
    team: p.team || [],
    metrics: p.metrics || null,
    contacts: p.contacts || [],
    meetings: p.meetings || [],
  }
}
