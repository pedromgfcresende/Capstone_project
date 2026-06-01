import { useState } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Zap, Shield, ArrowUpRight } from 'lucide-react'

// ── Mock data keyed by workspace id ──────────────────────────────────────────
const MOCK = {
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
}

const FALLBACK = {
  thesis: '', tam: '', sam: '', som: '', cagr: '', maturity: '', dataDate: '',
  tailwinds: [], headwinds: [], whyNow: [], recentMA: [], newEntrants: [],
  regulatory: [], adoptionStage: '', adoptionEvidence: '', exits: [],
  tamFlag: false, samFlag: false, somFlag: false,
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute">{children}</span>
}

function SignalCard({ icon: Icon, iconColor, label, items }) {
  const [openIdx, setOpenIdx] = useState(null)
  return (
    <div className="bg-white border border-rule rounded-lg overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-rule">
        <Icon size={12} style={{ color: iconColor }} />
        <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-ink-mute">{label}</span>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-4 font-sans text-[12px] text-ink-mute italic">None captured yet</div>
      ) : (
        <ul className="flex flex-col divide-y divide-rule">
          {items.map((item, i) => (
            <li key={i}>
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left bg-transparent border-0 cursor-pointer hover:bg-bg transition-colors"
              >
                <span className="font-sans text-[12.5px] text-ink leading-snug flex-1">{item.title}</span>
                {openIdx === i ? <ChevronUp size={11} className="text-ink-mute shrink-0" /> : <ChevronDown size={11} className="text-ink-mute shrink-0" />}
              </button>
              {openIdx === i && (
                <div className="px-4 pb-3">
                  <p className="font-sans text-[12px] text-ink-soft leading-relaxed">{item.detail}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const IMPACT_COLORS = {
  High:   { bg: '#fce6dc', text: '#c04a22' },
  Medium: { bg: '#fff3cd', text: '#856404' },
  Low:    { bg: '#f0ede8', text: '#8a8580' },
}

const LIKELIHOOD_COLORS = {
  High:         { bg: '#d4edda', text: '#2d6a3f' },
  Medium:       { bg: '#fff3cd', text: '#856404' },
  'Low (near-term)': { bg: '#f0ede8', text: '#8a8580' },
  Low:          { bg: '#f0ede8', text: '#8a8580' },
}

const STAGE_POSITION = { 'Early Adopters': 15, 'Early Majority': 42, 'Late Majority': 68, 'Laggards': 88 }

// ── Main component ────────────────────────────────────────────────────────────

export default function OverviewTab({ workspace }) {
  const d = MOCK[workspace.id] || FALLBACK
  const [expandedExit, setExpandedExit] = useState(null)

  const pos = STAGE_POSITION[d.adoptionStage] ?? 30

  return (
    <div className="flex-1 overflow-y-auto bg-bg">
      <div className="px-8 py-8 max-w-[900px] mx-auto flex flex-col gap-8">

        {/* ── 1. Market Snapshot ── */}
        <div className="bg-white border border-rule rounded-lg p-6 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-6">
            <div className="flex flex-col gap-2 flex-1">
              <SectionLabel>Market Snapshot</SectionLabel>
              <p className="font-sans text-[13.5px] text-ink leading-relaxed">{d.thesis || 'No thesis captured yet.'}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {d.cagr && <span className="font-mono text-[11px] text-ink-mute">{d.cagr}</span>}
              {d.maturity && <span className="font-mono text-[11px] text-ink-mute">{d.maturity}</span>}
              {d.dataDate && <span className="font-mono text-[10px] text-ink-mute opacity-60">Data: {d.dataDate}</span>}
            </div>
          </div>
        </div>

        {/* ── 2. Market Sizing ── */}
        <div className="flex flex-col gap-3">
          <SectionLabel>Market Sizing</SectionLabel>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'TAM', sub: 'Total Addressable Market', value: d.tam, flag: d.tamFlag, flagLabel: '>$1B — Venture-scale confirmed' },
              { key: 'SAM', sub: 'Serviceable Addressable Market', value: d.sam, flag: d.samFlag, flagLabel: 'Addressable slice' },
              { key: 'SOM', sub: 'Target Obtainable Market', value: d.som, flag: d.somFlag, flagLabel: 'Realistic near-term capture' },
            ].map(({ key, sub, value, flag, flagLabel }) => (
              <div key={key} className="bg-white border border-rule rounded-lg p-5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">{key}</span>
                  {flag && (
                    <span className="font-mono text-[8px] uppercase tracking-[0.06em] px-1.5 py-0.5 rounded" style={{ background: '#d4edda', color: '#2d6a3f' }}>✓ Venture-scale</span>
                  )}
                </div>
                <div className="font-serif text-[28px] font-semibold text-ink">{value || '—'}</div>
                <div className="font-sans text-[11px] text-ink-mute">{sub}</div>
                <div className="font-sans text-[11px] text-ink-soft italic">{flagLabel}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3. Structural Signals ── */}
        <div className="flex flex-col gap-3">
          <SectionLabel>Structural Signals</SectionLabel>
          <div className="grid grid-cols-3 gap-3">
            <SignalCard icon={TrendingUp} iconColor="#2d6a3f" label="Tailwinds" items={d.tailwinds} />
            <SignalCard icon={TrendingDown} iconColor="#c04a22" label="Headwinds" items={d.headwinds} />
            <SignalCard icon={Zap} iconColor="#2a5fd4" label="Why Now" items={d.whyNow} />
          </div>

          {/* Recent M&A + new entrants */}
          <div className="grid grid-cols-2 gap-3 mt-1">
            <div className="bg-white border border-rule rounded-lg p-5 flex flex-col gap-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-ink-mute">Recent M&amp;A Activity</span>
              {d.recentMA.length === 0 ? (
                <p className="font-sans text-[12px] text-ink-mute italic">None recorded</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {d.recentMA.map((m, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="font-mono text-[10px] text-ink-mute shrink-0 mt-[2px]">{m.date}</span>
                      <div>
                        <div className="font-sans text-[12.5px] font-medium text-ink">{m.event}</div>
                        <div className="font-sans text-[11.5px] text-ink-soft leading-snug mt-0.5">{m.note}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-white border border-rule rounded-lg p-5 flex flex-col gap-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-ink-mute">Notable New Entrants (last 24 months)</span>
              {d.newEntrants.length === 0 ? (
                <p className="font-sans text-[12px] text-ink-mute italic">None recorded</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {d.newEntrants.map((e, i) => (
                    <span key={i} className="font-sans text-[12px] px-3 py-1 rounded-full border" style={{ background: '#f5f2ef', color: '#4a4a4a', borderColor: '#e8e0d4' }}>{e}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 4. Regulatory & Policy Radar ── */}
        <div className="flex flex-col gap-3">
          <SectionLabel>Regulatory &amp; Policy Radar</SectionLabel>
          <div className="bg-white border border-rule rounded-lg overflow-hidden">
            <div className="grid px-4 py-2 border-b border-rule bg-bg" style={{ gridTemplateColumns: '48px 90px 1fr 72px' }}>
              {['Region', 'Date', 'Development', 'Impact'].map(h => (
                <span key={h} className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-ink-mute">{h}</span>
              ))}
            </div>
            {d.regulatory.length === 0 ? (
              <div className="px-4 py-6 font-sans text-[12.5px] text-ink-mute italic text-center">No regulatory items recorded</div>
            ) : (
              <ul className="divide-y divide-rule">
                {d.regulatory.map((r, i) => {
                  const ic = IMPACT_COLORS[r.impact] || IMPACT_COLORS.Low
                  return (
                    <li key={i} className="grid items-start px-4 py-3.5 gap-3 hover:bg-bg transition-colors" style={{ gridTemplateColumns: '48px 90px 1fr 72px' }}>
                      <span className="font-mono text-[9px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded text-center" style={{ background: '#e8f0fe', color: '#2a5fd4' }}>{r.region}</span>
                      <span className="font-mono text-[10px] text-ink-mute pt-0.5">{r.date}</span>
                      <div>
                        <div className="font-sans text-[12.5px] font-medium text-ink">{r.label}</div>
                        <div className="font-sans text-[11.5px] text-ink-soft leading-snug mt-0.5">{r.note}</div>
                      </div>
                      <span className="font-mono text-[8.5px] uppercase tracking-[0.06em] px-2 py-0.5 rounded h-fit" style={{ background: ic.bg, color: ic.text }}>{r.impact}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ── 5. Customer Adoption Curve ── */}
        <div className="flex flex-col gap-3">
          <SectionLabel>Customer Adoption Curve</SectionLabel>
          <div className="bg-white border border-rule rounded-lg p-6 flex flex-col gap-4">
            {/* S-curve stage bar */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between font-mono text-[9px] text-ink-mute uppercase tracking-[0.08em]">
                {['Early Adopters', 'Early Majority', 'Late Majority', 'Laggards'].map(s => (
                  <span key={s} style={{ color: s === d.adoptionStage ? '#1a1a1a' : undefined, fontWeight: s === d.adoptionStage ? 600 : undefined }}>{s}</span>
                ))}
              </div>
              <div className="relative h-2 rounded-full bg-rule overflow-visible">
                <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to right, #e8e0d4, #c04a22)' }} />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 shadow-sm"
                  style={{ left: `calc(${pos}% - 8px)`, borderColor: '#1a1a1a' }}
                />
              </div>
            </div>
            <p className="font-sans text-[12.5px] text-ink-soft leading-relaxed">{d.adoptionEvidence}</p>
          </div>
        </div>

        {/* ── 6. Exit Landscape ── */}
        <div className="flex flex-col gap-3 pb-6">
          <SectionLabel>Exit Landscape</SectionLabel>
          <div className="bg-white border border-rule rounded-lg overflow-hidden">
            <div className="grid px-4 py-2 border-b border-rule bg-bg" style={{ gridTemplateColumns: '160px 90px 1fr 120px' }}>
              {['Exit type', 'Likelihood', 'Likely acquirers', 'Implied multiple'].map(h => (
                <span key={h} className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-ink-mute">{h}</span>
              ))}
            </div>
            {d.exits.map((ex, i) => {
              const lc = LIKELIHOOD_COLORS[ex.likelihood] || LIKELIHOOD_COLORS.Low
              const open = expandedExit === i
              return (
                <div key={i} className="border-b border-rule last:border-b-0">
                  <button
                    onClick={() => setExpandedExit(open ? null : i)}
                    className="w-full grid items-center px-4 py-3.5 text-left bg-transparent border-0 cursor-pointer hover:bg-bg transition-colors gap-3"
                    style={{ gridTemplateColumns: '160px 90px 1fr 120px' }}
                  >
                    <span className="font-sans text-[12.5px] font-medium text-ink">{ex.type}</span>
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.06em] px-2 py-0.5 rounded w-fit" style={{ background: lc.bg, color: lc.text }}>{ex.likelihood}</span>
                    <span className="font-sans text-[12px] text-ink-soft truncate">{ex.acquirers}</span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-ink">{ex.multiples}</span>
                      {open ? <ChevronUp size={11} className="text-ink-mute" /> : <ChevronDown size={11} className="text-ink-mute" />}
                    </div>
                  </button>
                  {open && (
                    <div className="px-4 pb-4 pt-1 border-t border-rule bg-bg">
                      <div className="flex items-start gap-2">
                        <ArrowUpRight size={11} className="text-ink-mute mt-0.5 shrink-0" />
                        <div>
                          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-mute mr-2">Comparable transactions</span>
                          <span className="font-sans text-[12px] text-ink-soft">{ex.comparables}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
