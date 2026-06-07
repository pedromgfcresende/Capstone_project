// Segment-level (workspace) market overview data, keyed by workspace id.
// Authored inside each segment; the sector page rolls these up into a synthesis.

export const segmentOverview = {
  'ws-1': {
    thesis: 'The AP/AR automation layer is rapidly consolidating as CFOs demand unified payment workflows across invoicing, reconciliation and treasury. Payflows sits at the early-stage frontier of this consolidation, competing primarily with Pennylane on distribution and Spendesk on brand.',
    tam: '$8.2B', tamFlag: true,
    sam: '$2.1B', samFlag: false,
    som: '$420M', somFlag: false,
    cagr: '18% CAGR',
    maturity: 'Early Majority',
    dataDate: 'May 2025',
    tailwinds: [
      { title: 'Open banking mandates (PSD2 → PSD3)', detail: 'EU open banking regulation is lowering infrastructure cost for new entrants while forcing banks to open APIs — accelerating fintech distribution.' },
      { title: 'CFO software consolidation', detail: 'Finance teams are consolidating spend management, AP/AR, and treasury into unified platforms. Point solutions with strong integration stories win.' },
      { title: 'AI-native automation displacing ERP', detail: 'Gartner, Forrester and IDC all flag AP/AR automation as a top-5 CFO priority for 2024–25. AI-native tools are replacing rule-based reconciliation.' },
    ],
    headwinds: [
      { title: 'Compliance cost as a barrier', detail: 'PSD3 and AML requirements raise the cost of operating as a licensed payment institution, compressing margins for early-stage players.' },
      { title: 'Incumbent bank counter-moves', detail: 'Tier-1 banks are embedding payment automation into existing corporate banking relationships, leveraging switching costs and pricing leverage.' },
    ],
    whyNow: [
      { title: 'PSD3 enforcement creating urgency', detail: 'Trilogue completed Sept 2024 — enforcement expected 2026. Finance teams are actively evaluating infrastructure now to avoid last-minute compliance risk.' },
      { title: 'Post-COVID finance digitisation wave', detail: '60% of European CFOs plan to replace at least one ERP module with a point solution by 2026 (FT / Accenture survey, Feb 2025).' },
      { title: 'ERP replacement cycle at mid-market', detail: 'SAP and Oracle ERP refresh cycles are creating natural switching moments for mid-market CFOs — the primary ICP for AP/AR automation tools.' },
    ],
    recentMA: [
      { date: 'Jun 2024', event: 'Société Générale acquires Treezor', note: 'Incumbent absorption of BaaS infrastructure — narrows the independent BaaS market.' },
      { date: 'Oct 2023', event: 'Pleo acquires Tiller Systems', note: 'Horizontal expansion into restaurant/retail verticals — spend management broadening.' },
    ],
    newEntrants: ['Finloup (2023, FR)', 'Subi (2023, ES)', 'Karmen (2021, FR)'],
    regulatory: [
      { region: 'EU', date: 'Sep 2024', label: 'PSD3 enters trilogue', impact: 'High', note: 'Broadens open banking obligations and tightens liability rules. Enforcement expected 2026.' },
      { region: 'EU', date: 'Mar 2025', label: 'DORA goes live for financial institutions', impact: 'Medium', note: 'Digital operational resilience requirements — affects fintechs processing payments above thresholds.' },
      { region: 'EU', date: 'Jan 2025', label: 'AML Package 6 adopted', impact: 'Medium', note: 'Stricter KYB and transaction monitoring rules — raises compliance cost for embedded finance players.' },
    ],
    adoptionStage: 'Early Majority',
    adoptionEvidence: 'Over 400,000 SMBs in France now use a dedicated fintech for payments or expense management (Banque de France, 2024). Google Trends for "AP automation" and "expense management software" show sustained upward slope across the EU since 2022.',
    exits: [
      { type: 'Strategic M&A', likelihood: 'High', acquirers: 'SAP, Sage, Oracle, Major banks (BNP, SocGen)', multiples: '6–10× ARR', comparables: 'Treezor / SocGen (2024), Divvy / BILL ($2.5B, 2021)' },
      { type: 'PE Buyout', likelihood: 'Medium', acquirers: 'Vista, Thoma Bravo, Hg Capital', multiples: '5–8× ARR', comparables: 'Payhawk at $1B (growth equity, 2024)' },
      { type: 'IPO', likelihood: 'Low (near-term)', acquirers: '—', multiples: '8–15× ARR at scale', comparables: 'Toast (US, 2021), Brex (likely 2025–26)' },
    ],
  },
  'ws-2': {
    thesis: 'CSRD has turned carbon accounting from a differentiating feature into a compliance necessity, compressing margins and accelerating commoditisation. Sweep is well-positioned at the enterprise end, but the SMB tier is increasingly contested.',
    tam: '$3.4B', tamFlag: true,
    sam: '$900M', samFlag: false,
    som: '$180M', somFlag: false,
    cagr: '24% CAGR',
    maturity: 'Early Adopters',
    dataDate: 'Apr 2025',
    tailwinds: [
      { title: 'CSRD mandatory reporting for large-caps', detail: 'CSRD enforcement for large EU companies began FY2024. Mid-caps follow in FY2026. Creates immediate pipeline.' },
      { title: 'Investor ESG pressure institutionalised', detail: 'SFDR and EU taxonomy mean LPs are requiring portfolio-level carbon visibility — fund managers are pushing this down to portfolio companies.' },
      { title: 'Data verification as premium layer', detail: 'Bloomberg NEF: data verification is now the primary switching cost in enterprise carbon platforms — creates upsell and pricing power.' },
    ],
    headwinds: [
      { title: 'Commoditisation of measurement tools', detail: 'Basic carbon measurement is becoming table-stakes. SMB tools are proliferating and driving down ACV across the lower segment.' },
      { title: 'CSRD mid-cap delay softens near-term pipeline', detail: 'EC pushed mid-cap enforcement to FY2026 — reduces urgency for the SMB tier that many platforms depend on for volume.' },
    ],
    whyNow: [
      { title: 'CSRD enforcement now live for large-caps', detail: 'FY2024 reporting obligations are active — enterprise procurement cycles are moving now.' },
      { title: 'SFDR pressure cascades down supply chains', detail: 'Large-cap CSRD requirements cascade to Scope 3 — meaning SMB suppliers face carbon data requests from their enterprise customers.' },
    ],
    recentMA: [
      { date: 'Feb 2024', event: 'Greenly raises €31M Series B', note: 'SMB-focused play gaining traction with CSRD-readiness messaging.' },
    ],
    newEntrants: ['Carbonfact (2021, FR)', 'Metrio (2022, EU)'],
    regulatory: [
      { region: 'EU', date: 'Mar 2025', label: 'EC confirms CSRD mid-cap delay to FY2026', impact: 'Medium', note: 'Short-term pipeline softens for SMB tools; enterprise demand unaffected.' },
      { region: 'EU', date: 'Jan 2024', label: 'SFDR Level 2 RTS in force', impact: 'High', note: 'Fund managers must disclose portfolio-level sustainability data — drives demand upstream.' },
    ],
    adoptionStage: 'Early Adopters',
    adoptionEvidence: 'Carbon accounting software penetration among CSRD-obligated large-caps is estimated at 35–40% (PwC ESG survey, 2024). Google Trends for "CSRD software" and "carbon accounting platform" show sharp acceleration from Q3 2023.',
    exits: [
      { type: 'Strategic M&A', likelihood: 'High', acquirers: 'SAP, Salesforce, IBM, Big 4 consulting arms', multiples: '8–14× ARR', comparables: 'Plan A / undisclosed (2024), Persefoni fundraise signals exit readiness' },
      { type: 'PE Buyout', likelihood: 'Low', acquirers: 'Specialist ESG-focused funds', multiples: '6–10× ARR', comparables: 'Limited precedent at scale in EU' },
      { type: 'IPO', likelihood: 'Low (near-term)', acquirers: '—', multiples: '10–18× ARR at scale', comparables: 'No direct public comp yet in EU carbon SaaS' },
    ],
  },
  'ws-3': {
    thesis: 'Corporate cards and spend management have matured into the most contested segment of embedded finance, competing on UX, international coverage and AI-driven controls. Differentiation is moving from card issuance to the automation layer wrapped around it.',
    tam: '$6.1B', tamFlag: true,
    sam: '$1.8B', samFlag: false,
    som: '$310M', somFlag: false,
    cagr: '15% CAGR',
    maturity: 'Late Majority',
    dataDate: 'May 2025',
    tailwinds: [
      { title: 'Card interchange economics fund free distribution', detail: 'Interchange revenue lets players give software away and monetise on spend — driving rapid PLG adoption across the mid-market.' },
      { title: 'AI-driven controls as new differentiator', detail: 'Real-time policy enforcement and anomaly detection are becoming the primary reason finance teams switch providers.' },
    ],
    headwinds: [
      { title: 'Commoditisation of card issuance', detail: 'BaaS providers have made issuing cards trivial — the category is crowded and pricing pressure is intense.' },
      { title: 'Neobank bundling threat', detail: 'Qonto and similar neobanks bundle spend management for free, squeezing standalone players in the low end.' },
    ],
    whyNow: [
      { title: 'Mid-market consolidation moment', detail: 'Finance teams are rationalising tool sprawl — favouring suites over point solutions, which rewards the scaled players now.' },
    ],
    recentMA: [
      { date: 'Oct 2023', event: 'Pleo acquires Tiller Systems', note: 'Horizontal expansion into restaurant/retail verticals — spend management broadening.' },
    ],
    newEntrants: ['Mooncard (FR)', 'Tola (UK)'],
    regulatory: [
      { region: 'EU', date: 'Sep 2024', label: 'PSD3 enters trilogue', impact: 'Medium', note: 'Tightens liability rules for card issuers and payment institutions. Enforcement expected 2026.' },
      { region: 'EU', date: 'Dec 2024', label: 'Interchange fee cap review', impact: 'High', note: 'EC review of interchange caps could compress the revenue model that funds free distribution.' },
    ],
    adoptionStage: 'Late Majority',
    adoptionEvidence: 'Spend management penetration among EU SMBs above 50 employees is estimated at 55–60% (McKinsey, 2024). Google Trends for "expense management software" has flattened since 2023 — a sign of late-majority maturity.',
    exits: [
      { type: 'Strategic M&A', likelihood: 'High', acquirers: 'Major banks, SAP Concur, Visa/Mastercard', multiples: '5–9× ARR', comparables: 'Divvy / BILL ($2.5B, 2021)' },
      { type: 'PE Buyout', likelihood: 'Medium', acquirers: 'Vista, Thoma Bravo', multiples: '4–7× ARR', comparables: 'Payhawk growth equity at $1B (2024)' },
      { type: 'IPO', likelihood: 'Low (near-term)', acquirers: '—', multiples: '6–12× ARR at scale', comparables: 'Brex / Ramp (US) likely 2025–26' },
    ],
  },
  'ws-4': {
    thesis: 'Embedded B2B lending — trade credit, revenue-based financing and BNPL plugged into platforms and checkout — is the fastest-growing but least mature embedded finance segment. Underwriting on real-time payment and accounting data is the wedge, but capital cost and default risk in a higher-rate environment are unresolved.',
    tam: '$4.7B', tamFlag: true,
    sam: '$1.1B', samFlag: false,
    som: '$190M', somFlag: false,
    cagr: '29% CAGR',
    maturity: 'Early Adopters',
    dataDate: 'May 2025',
    tailwinds: [
      { title: 'Real-time data enables better underwriting', detail: 'Open banking and accounting APIs let lenders underwrite on live cash-flow data, expanding the addressable borrower base.' },
      { title: 'SMB working-capital gap', detail: 'Traditional banks have retreated from SMB lending, leaving a structural financing gap that embedded players are filling.' },
    ],
    headwinds: [
      { title: 'Higher-rate environment squeezes economics', detail: 'Rising cost of capital compresses spreads and raises default risk for thinly-capitalised lenders.' },
      { title: 'Balance-sheet intensity', detail: 'Lending requires capital that pure-SaaS investors are wary of — funding the loan book is a structural constraint.' },
    ],
    whyNow: [
      { title: 'Bank retreat from SMB credit', detail: 'Post-2023 banking stress accelerated incumbent pullback from SMB lending, opening the window for embedded players now.' },
      { title: 'Data infrastructure finally mature', detail: 'Open banking coverage has reached the threshold where data-driven underwriting is viable at scale across the EU.' },
    ],
    recentMA: [
      { date: 'Mar 2024', event: 'Silvr raises debt facility', note: 'Signals investor appetite for scaling RBF loan books despite the rate environment.' },
    ],
    newEntrants: ['Defacto (FR)', 'Karmen (FR)'],
    regulatory: [
      { region: 'EU', date: 'Sep 2024', label: 'PSD3 enters trilogue', impact: 'Medium', note: 'Affects how embedded lenders access and use payment data for underwriting.' },
      { region: 'EU', date: 'Jun 2024', label: 'Consumer Credit Directive 2 in force', impact: 'High', note: 'Extends disclosure and affordability rules — some BNPL/trade-credit models fall into scope.' },
    ],
    adoptionStage: 'Early Adopters',
    adoptionEvidence: 'Embedded lending penetration among EU B2B platforms is in the low single digits (Bain, 2024) — clearly early-adopter territory. Google Trends for "revenue based financing" and "embedded lending" show steep climbs from 2022 onward.',
    exits: [
      { type: 'Strategic M&A', likelihood: 'Medium', acquirers: 'Full-stack AP/AR platforms, banks, marketplaces', multiples: '4–8× ARR (or book multiple)', comparables: 'Limited EU precedent — mostly acqui-hires so far' },
      { type: 'PE Buyout', likelihood: 'Low', acquirers: 'Credit-focused funds', multiples: '3–6× ARR', comparables: 'Thin comparable set at this stage' },
      { type: 'IPO', likelihood: 'Low (near-term)', acquirers: '—', multiples: 'n/a near-term', comparables: 'No EU embedded-lending public comp' },
    ],
  },
}

export const FALLBACK_OVERVIEW = {
  thesis: '', tam: '', sam: '', som: '', cagr: '', maturity: '', dataDate: '',
  tailwinds: [], headwinds: [], whyNow: [], recentMA: [], newEntrants: [],
  regulatory: [], adoptionStage: '', adoptionEvidence: '', exits: [],
  tamFlag: false, samFlag: false, somFlag: false,
}
