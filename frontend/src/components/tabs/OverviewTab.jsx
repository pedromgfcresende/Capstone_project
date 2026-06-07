import { useState } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Zap, ArrowUpRight } from 'lucide-react'
import { FALLBACK_OVERVIEW } from '../../data/segmentOverview'
import { VerifyDot, VerifyLegend, useVerifyMap } from '../VerifyDot'

// Map the AI synthesis market block (snake_case) onto the tab's shape.
function marketToOverview(workspace) {
  const syn = workspace.synthesis
  const m = syn?.overview?.market
  if (!m) return FALLBACK_OVERVIEW
  return {
    ...FALLBACK_OVERVIEW,
    thesis: syn.overview.text || '',
    tam: m.tam, sam: m.sam, som: m.som, cagr: m.cagr,
    adoptionStage: m.adoption_stage,
    adoptionEvidence: m.adoption_evidence,
    tailwinds: m.tailwinds || [],
    headwinds: m.headwinds || [],
    whyNow: m.why_now || [],
    regulatory: m.regulatory || [],
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute">{children}</span>
}

function SignalCard({ icon: Icon, iconColor, label, items }) {
  const [openIdx, setOpenIdx] = useState(null)
  const verify = useVerifyMap()
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
              <div className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-bg transition-colors">
                <VerifyDot status={verify.get(i)} onClick={() => verify.cycle(i)} />
                <button
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  className="flex-1 flex items-center justify-between gap-3 text-left bg-transparent border-0 cursor-pointer p-0"
                >
                  <span className="font-sans text-[12.5px] text-ink leading-snug flex-1">{item.title}</span>
                  {openIdx === i ? <ChevronUp size={11} className="text-ink-mute shrink-0" /> : <ChevronDown size={11} className="text-ink-mute shrink-0" />}
                </button>
              </div>
              {openIdx === i && (
                <div className="px-4 pb-3 pl-[34px]">
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
  const d = marketToOverview(workspace)
  const hasMarket = !!workspace.synthesis?.overview?.market
  const [expandedExit, setExpandedExit] = useState(null)
  const sizeVerify = useVerifyMap()
  const regVerify = useVerifyMap()
  const exitVerify = useVerifyMap()

  const pos = STAGE_POSITION[d.adoptionStage] ?? 30

  return (
    <div className="flex-1 overflow-y-auto bg-bg">
      <div className="px-8 py-8 max-w-[900px] mx-auto flex flex-col gap-8">

        {/* AI-estimated banner */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-rule bg-accent-soft/40"
          style={{ background: hasMarket ? '#fdf6f2' : '#fff' }}>
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-accent-deep">
            {hasMarket ? 'AI-estimated market read — verify before use' : 'No market read yet'}
          </span>
          {!hasMarket && (
            <span className="font-sans text-[12px] text-ink-mute">
              · click <span className="font-semibold text-ink">Synthesise</span> to generate market sizing & signals
            </span>
          )}
        </div>

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
                  <div className="flex items-center gap-2">
                    <VerifyDot status={sizeVerify.get(key)} onClick={() => sizeVerify.cycle(key)} />
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">{key}</span>
                  </div>
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
          <div className="flex items-center justify-between">
            <SectionLabel>Structural Signals</SectionLabel>
            <VerifyLegend />
          </div>
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
                        <div className="flex items-center gap-2">
                          <VerifyDot status={regVerify.get(i)} onClick={() => regVerify.cycle(i)} />
                          <span className="font-sans text-[12.5px] font-medium text-ink">{r.label}</span>
                        </div>
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
                  <div
                    onClick={() => setExpandedExit(open ? null : i)}
                    className="w-full grid items-center px-4 py-3.5 text-left cursor-pointer hover:bg-bg transition-colors gap-3"
                    style={{ gridTemplateColumns: '160px 90px 1fr 120px' }}
                  >
                    <div className="flex items-center gap-2">
                      <VerifyDot status={exitVerify.get(i)} onClick={() => exitVerify.cycle(i)} />
                      <span className="font-sans text-[12.5px] font-medium text-ink">{ex.type}</span>
                    </div>
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.06em] px-2 py-0.5 rounded w-fit" style={{ background: lc.bg, color: lc.text }}>{ex.likelihood}</span>
                    <span className="font-sans text-[12px] text-ink-soft truncate">{ex.acquirers}</span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-ink">{ex.multiples}</span>
                      {open ? <ChevronUp size={11} className="text-ink-mute" /> : <ChevronDown size={11} className="text-ink-mute" />}
                    </div>
                  </div>
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
