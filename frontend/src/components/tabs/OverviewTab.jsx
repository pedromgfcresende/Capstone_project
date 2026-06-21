import { useState } from 'react'
import { ChevronDown, ChevronUp, ArrowUpRight } from 'lucide-react'
import { FALLBACK_OVERVIEW } from '../../data/segmentOverview'
import { VerifyDot, VerifyLegend, useVerifyMap } from '../VerifyDot'

// Market figures sometimes arrive with a trailing parenthetical category
// description ("~25-35% CAGR (AI customer service ... platforms)") — keep the
// value, drop the run-on so it renders cleanly in the small metric slots.
function cleanMetric(s) {
  if (!s) return s
  return String(s).replace(/\s*\([^)]*\)?/g, '').replace(/\s+/g, ' ').trim()
}

// Map the AI synthesis market block (snake_case) onto the tab's shape.
function marketToOverview(workspace) {
  const syn = workspace.synthesis
  const m = syn?.overview?.market
  if (!m) return FALLBACK_OVERVIEW
  return {
    ...FALLBACK_OVERVIEW,
    thesis: syn.overview.text || '',
    tam: cleanMetric(m.tam), sam: cleanMetric(m.sam), som: cleanMetric(m.som), cagr: cleanMetric(m.cagr),
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

const IMPACT_COLORS = {
  High:   { bg: '#fbe3dc', text: '#c04a22' },
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
          style={{ background: hasMarket ? '#f1effb' : '#fff' }}>
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
                <div className="font-sans text-[26px] font-bold text-ink tracking-tight">{value || '—'}</div>
                <div className="font-sans text-[11px] text-ink-mute">{sub}</div>
                <div className="font-sans text-[11px] text-ink-soft italic">{flagLabel}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3. Regulatory & Policy Radar ── */}
        {/* Structural Signals / Recent M&A / New Entrants were removed — not
            verifiable from the available data. Regulatory radar stays. */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <SectionLabel>Regulatory &amp; Policy Radar</SectionLabel>
            <VerifyLegend />
          </div>
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
                        {(r.source || r.url) && (
                          <a href={r.url || undefined} target="_blank" rel="noreferrer"
                            className="font-mono text-[9px] text-accent-deep hover:underline mt-1 inline-block">
                            source: {(r.source || r.url).replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                          </a>
                        )}
                      </div>
                      <span className="font-mono text-[8.5px] uppercase tracking-[0.06em] px-2 py-0.5 rounded h-fit" style={{ background: ic.bg, color: ic.text }}>{r.impact}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <p className="font-mono text-[8.5px] text-ink-mute italic">
            AI-estimated — verify against primary regulation (e.g. EUR-Lex, national regulators) before relying on it.
          </p>
        </div>

        {/* ── 5. Customer Adoption Curve ── */}
        <div className="flex flex-col gap-3">
          <SectionLabel>Customer Adoption Curve</SectionLabel>
          <div className="bg-white border border-rule rounded-lg p-6 flex flex-col gap-4">
            {/* S-curve stage bar */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between font-mono text-[9px] text-ink-mute uppercase tracking-[0.08em]">
                {['Early Adopters', 'Early Majority', 'Late Majority', 'Laggards'].map(s => (
                  <span key={s} style={{ color: s === d.adoptionStage ? '#15063b' : undefined, fontWeight: s === d.adoptionStage ? 600 : undefined }}>{s}</span>
                ))}
              </div>
              <div className="relative h-2 rounded-full bg-rule overflow-visible">
                <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to right, #e8e0d4, #c04a22)' }} />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 shadow-sm"
                  style={{ left: `calc(${pos}% - 8px)`, borderColor: '#15063b' }}
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
