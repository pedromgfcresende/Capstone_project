// Claim-level provenance per workspace (segment). Each row is a specific claim
// made somewhere in the workspace, traced to its source, with type, evidence
// level, verification status, and where it appears.

export const TYPE_COLORS = {
  'Primary':   { bg: '#e8f0fe', text: '#2a5fd4' },
  'Secondary': { bg: '#fbf3d9', text: '#9a7b1f' },
  'Tertiary':  { bg: '#f0ede8', text: '#8a8580' },
}

export const STATUS_COLORS = {
  'Verified':   { bg: '#d9ecdf', text: '#2d6a3f' },
  'Unverified': { bg: '#f0ede8', text: '#a39e96' },
}

export const TYPE_LIST = Object.keys(TYPE_COLORS)
export const LEVEL_LIST = ['L1', 'L2', 'L3']

export const segmentSources = {
  'ws-1': [
    { id: 'c1',  claim: 'Global AP automation TAM: $8.2B by 2030', source: 'grandviewresearch.com/industry/ap-automation', url: 'https://www.grandviewresearch.com', type: 'Secondary', level: 'L1', status: 'Unverified', location: 'Overview' },
    { id: 'c2',  claim: 'AP/AR automation ranked top-5 CFO technology investment (Gartner Q4 2024)', source: 'gartner.com/cfo-tech-priorities-2024', url: 'https://www.gartner.com', type: 'Secondary', level: 'L1', status: 'Unverified', location: 'Dynamics' },
    { id: 'c3',  claim: 'PSD3 trilogue concluded September 2024; enforcement timeline 2026', source: 'ec.europa.eu/finance/psd3', url: 'https://finance.ec.europa.eu', type: 'Primary', level: 'L1', status: 'Unverified', location: 'Dynamics' },
    { id: 'c4',  claim: 'DORA digital resilience requirements live March 2025', source: 'eba.europa.eu/dora', url: 'https://www.eba.europa.eu', type: 'Primary', level: 'L1', status: 'Unverified', location: 'Dynamics' },
    { id: 'c5',  claim: 'AP/AR and CFO SaaS M&A median multiple: 7.2× ARR (companies >$5M ARR)', source: 'pitchbook.com/fintech-exits-2024', url: 'https://pitchbook.com', type: 'Secondary', level: 'L1', status: 'Unverified', location: 'Exit Landscape' },
    { id: 'c6',  claim: 'Payflows raises €6M Series A led by Stride VC', source: 'techcrunch.com/payflows-series-a', url: 'https://techcrunch.com', type: 'Secondary', level: 'L3', status: 'Verified', location: 'Profile' },
    { id: 'c7',  claim: 'Payflows headcount: 18 employees (LinkedIn, April 2025)', source: 'linkedin.com/company/payflows', url: 'https://www.linkedin.com', type: 'Secondary', level: 'L3', status: 'Verified', location: 'Profile' },
    { id: 'c8',  claim: 'Payflows ARR estimated ~€800K (inferred, low confidence)', source: 'linkedin.com/company/payflows (inferred)', url: 'https://www.linkedin.com', type: 'Tertiary', level: 'L3', status: 'Unverified', location: 'Profile' },
    { id: 'c9',  claim: 'Alma cited as design partner and early customer (Series A press release)', source: 'techcrunch.com/payflows-series-a', url: 'https://techcrunch.com', type: 'Secondary', level: 'L3', status: 'Verified', location: 'Traction' },
    { id: 'c10', claim: 'Payflows job posting: Account Executive (DACH market entry)', source: 'jobs.lever.co/payflows', url: 'https://jobs.lever.co', type: 'Secondary', level: 'L3', status: 'Verified', location: 'Traction' },
    { id: 'c11', claim: 'Société Générale acquires Treezor (BaaS infrastructure absorption)', source: 'lefigaro.fr/societe-generale-treezor', url: 'https://www.lefigaro.fr', type: 'Secondary', level: 'L1', status: 'Unverified', location: 'Dynamics' },
    { id: 'c12', claim: 'Pennylane raises €75M Series C, led by DST Global', source: 'techcrunch.com/pennylane-series-c', url: 'https://techcrunch.com', type: 'Secondary', level: 'L2', status: 'Unverified', location: 'Dynamics' },
    { id: 'c13', claim: 'Qonto surpasses 400,000 business customers', source: 'qonto.com/press', url: 'https://qonto.com', type: 'Secondary', level: 'L2', status: 'Unverified', location: 'Players' },
    { id: 'c14', claim: 'Agicap raises €45M Series C for DACH expansion', source: 'eu-startups.com/agicap-series-c', url: 'https://www.eu-startups.com', type: 'Secondary', level: 'L2', status: 'Unverified', location: 'Dynamics' },
    { id: 'c15', claim: '60% of EU CFOs plan to replace an ERP module by 2026', source: 'ft.com/cfo-erp-survey-2025', url: 'https://www.ft.com', type: 'Secondary', level: 'L2', status: 'Unverified', location: 'Overview' },
  ],
  'ws-2': [
    { id: 'c1', claim: 'Carbon accounting TAM: $3.4B', source: 'verdantix.com/carbon-accounting', url: 'https://www.verdantix.com', type: 'Secondary', level: 'L1', status: 'Unverified', location: 'Overview' },
    { id: 'c2', claim: 'CSRD large-cap reporting mandatory from FY2024', source: 'ec.europa.eu/finance/csrd', url: 'https://finance.ec.europa.eu', type: 'Primary', level: 'L1', status: 'Verified', location: 'Dynamics' },
    { id: 'c3', claim: 'Sweep raises $73M Series B', source: 'techcrunch.com/sweep-series-b', url: 'https://techcrunch.com', type: 'Secondary', level: 'L3', status: 'Verified', location: 'Profile' },
    { id: 'c4', claim: 'Greenly raises €31M Series B', source: 'techcrunch.com/greenly-series-b', url: 'https://techcrunch.com', type: 'Secondary', level: 'L2', status: 'Unverified', location: 'Dynamics' },
    { id: 'c5', claim: 'Data verification emerging as primary switching cost (BNEF)', source: 'about.bnef.com/carbon-verification', url: 'https://about.bnef.com', type: 'Secondary', level: 'L1', status: 'Unverified', location: 'Differentiation' },
  ],
  'ws-3': [
    { id: 'c1', claim: 'Spend management penetration 55–60% of EU SMBs >50 employees', source: 'mckinsey.com/spend-management-2024', url: 'https://www.mckinsey.com', type: 'Secondary', level: 'L1', status: 'Unverified', location: 'Overview' },
    { id: 'c2', claim: 'Pleo has the fastest self-serve onboarding in the category', source: 'pleo.io/product (inferred)', url: 'https://www.pleo.io', type: 'Tertiary', level: 'L3', status: 'Unverified', location: 'Differentiation' },
    { id: 'c3', claim: 'Payhawk raises $100M at $1B valuation', source: 'techcrunch.com/payhawk-unicorn', url: 'https://techcrunch.com', type: 'Secondary', level: 'L3', status: 'Verified', location: 'Profile' },
    { id: 'c4', claim: 'EC interchange fee cap under review', source: 'ec.europa.eu/finance/interchange', url: 'https://finance.ec.europa.eu', type: 'Primary', level: 'L1', status: 'Unverified', location: 'Dynamics' },
  ],
  'ws-4': [
    { id: 'c1', claim: 'Embedded lending penetration among EU B2B platforms in low single digits', source: 'bain.com/embedded-lending-2024', url: 'https://www.bain.com', type: 'Secondary', level: 'L1', status: 'Unverified', location: 'Overview' },
    { id: 'c2', claim: 'Defacto underwrites on real-time banking + accounting data', source: 'Founder call (Feb 2025)', url: '', type: 'Tertiary', level: 'L3', status: 'Unverified', location: 'Differentiation' },
    { id: 'c3', claim: 'Consumer Credit Directive 2 now in force', source: 'ec.europa.eu/finance/ccd2', url: 'https://finance.ec.europa.eu', type: 'Primary', level: 'L1', status: 'Unverified', location: 'Dynamics' },
    { id: 'c4', claim: 'Silvr raises debt facility to scale RBF loan book', source: 'techcrunch.com/silvr-debt', url: 'https://techcrunch.com', type: 'Secondary', level: 'L3', status: 'Verified', location: 'Traction' },
  ],
}
