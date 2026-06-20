import { useState, useRef, useCallback, useMemo } from 'react'
import { ChevronDown, Hand, ShieldCheck, AlertCircle, Database, Loader2 } from 'lucide-react'
import { collectRegistry } from '../../api/client'

// ── Structured 2x2 matrix ─────────────────────────────────────────────────────
// All positioning comes from structured fields with transparent, published
// cutoffs — never an LLM score. X is always Funding (EUR). Y toggles between
// Year Founded and Employee Count. A company plots only when BOTH the chosen
// axis values are present AND the values are trusted (CRM/CSV, or analyst-
// verified). Anything else sits in the "Not on the matrix" tray for manual
// placement. (Spec: Comparative Tab.pdf)

const DEFAULTS = { fundingCutoffEur: 2_000_000, yearFoundedCutoff: 2023, employeeCutoff: 15 }

const Y_AXES = {
  year:      { id: 'year',      label: 'Year Founded',   field: 'yearFounded',   low: 'Established', high: 'Founded ≤2 yrs' },
  employees: { id: 'employees', label: 'Employee Count', field: 'employeeCount', low: 'Small team',  high: 'Large team' },
}

// Quadrant captions per Y mode: [top-left, top-right, bottom-left, bottom-right]
const QUADRANTS = {
  year: { tl: 'Lean · young', tr: 'Well-funded · young', bl: 'Lean · established', br: 'Well-funded · established' },
  employees: { tl: 'Bootstrapped scale', tr: 'Scaling', bl: 'Early · lean', br: 'Capital-efficient' },
}

const COLORS = { focal: { bg: '#8b80e6', border: '#6a5cd6' }, default: { bg: '#15063b', border: '#15063b' } }

// Bounded, monotonic placement centred on the cutoff (value==cutoff -> 50%).
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
function logPos(value, cutoff, k = 0.6) {
  if (value <= 0) return 8
  return 50 + 40 * Math.tanh(k * (Math.log(value) - Math.log(cutoff)))
}
function linPos(value, cutoff, spread = 3) {
  return 50 + 40 * Math.tanh((value - cutoff) / spread)
}

function fmtFunding(eur) {
  if (eur == null) return '—'
  if (eur >= 1e9) return `€${(eur / 1e9).toFixed(1).replace(/\.0$/, '')}B`
  if (eur >= 1e6) return `€${(eur / 1e6).toFixed(1).replace(/\.0$/, '')}M`
  if (eur >= 1e3) return `€${Math.round(eur / 1e3)}K`
  return `€${Math.round(eur)}`
}

function yValueLabel(co, yAxis) {
  if (yAxis.id === 'year') return co.yearFounded ?? '—'
  return co.team || co.employeeCount || '—'
}

export default function ComparativeTab({ workspace }) {
  const cfg = useMemo(() => ({ ...DEFAULTS, ...(workspace.axisConfig || {}) }), [workspace.axisConfig])
  const companies = useMemo(() => workspace.companies || [], [workspace.companies])

  const [yMode, setYMode] = useState('year')
  const [menuOpen, setMenuOpen] = useState(false)
  const [showNames, setShowNames] = useState(true)
  // local trust overrides (analyst verifies an AI value so it may plot)
  const [verified, setVerified] = useState({})
  // manual placements: id -> {x,y}
  const [manual, setManual] = useState({})
  // registry-collected fields: id -> { yearFounded, location, source }
  const [collected, setCollected] = useState({})
  const [collecting, setCollecting] = useState({})

  const collect = async (id) => {
    setCollecting(c => ({ ...c, [id]: true }))
    try {
      const res = await collectRegistry(id)
      if (res.found) {
        setCollected(c => ({ ...c, [id]: { yearFounded: res.company.yearFounded, location: res.company.location, source: res.collected?.sourceName } }))
      } else {
        setCollected(c => ({ ...c, [id]: { notFound: true } }))
      }
    } catch {
      setCollected(c => ({ ...c, [id]: { notFound: true } }))
    } finally {
      setCollecting(c => ({ ...c, [id]: false }))
    }
  }

  const yAxis = Y_AXES[yMode]
  const quad = QUADRANTS[yMode]

  const canvasRef = useRef(null)
  const draggingRef = useRef(null)

  // Classify every company: plotted, needs-verification, or missing-data.
  const classified = useMemo(() => {
    return companies.map(raw => {
      const got = collected[raw.id]
      // registry collection backfills the founding year (and HQ)
      const co = got && !got.notFound
        ? { ...raw, yearFounded: got.yearFounded ?? raw.yearFounded, location: got.location ?? raw.location }
        : raw
      const fund = co.fundingEur
      const yVal = co[yAxis.field]
      const hasBoth = fund != null && yVal != null
      const isTrusted = co.trusted || verified[co.id]
      const manualPos = manual[co.id]
      let state
      if (manualPos) state = 'manual'
      else if (!hasBoth) state = 'missing'
      else if (!isTrusted) state = 'unverified'
      else state = 'plotted'

      const x = manualPos ? manualPos.x : (fund != null ? clamp(logPos(fund, cfg.fundingCutoffEur), 5, 95) : null)
      const cutoffY = yAxis.id === 'year' ? cfg.yearFoundedCutoff : cfg.employeeCutoff
      const yRaw = yAxis.id === 'year'
        ? (yVal != null ? linPos(yVal, cutoffY) : null)
        : (yVal != null ? logPos(yVal, cutoffY, 0.8) : null)
      // screen y: high value = top (small %)
      const y = manualPos ? manualPos.y : (yRaw != null ? clamp(100 - yRaw, 5, 95) : null)
      return { ...co, state, x, y, fund, yVal }
    })
  }, [companies, yAxis, verified, manual, cfg, collected])

  const plotted = classified.filter(c => c.state === 'plotted' || c.state === 'manual')
  const offMatrix = classified.filter(c => c.state === 'missing' || c.state === 'unverified')

  const getCoords = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return {
      x: clamp(((e.clientX - r.left) / r.width) * 100, 0, 100),
      y: clamp(((e.clientY - r.top) / r.height) * 100, 0, 100),
    }
  }
  const onMouseMove = useCallback((e) => {
    if (!draggingRef.current) return
    const { x, y } = getCoords(e)
    setManual(m => ({ ...m, [draggingRef.current]: { x, y } }))
  }, [])
  const onMouseUp = useCallback(() => { draggingRef.current = null }, [])

  const placeManually = (id) => setManual(m => ({ ...m, [id]: { x: 50, y: 50 } }))

  return (
    <div className="flex-1 flex flex-col min-h-0 px-8 py-4 overflow-y-auto">
      <div className="max-w-[860px] mx-auto w-full flex flex-col gap-3">

        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute">
              Positioning matrix · structured fields only
            </span>
            <div className="font-sans text-[11px] text-ink-mute mt-0.5">
              X: Funding · cutoff <span className="text-ink-soft font-medium">{fmtFunding(cfg.fundingCutoffEur)}</span>
              {'   ·   '}
              Y: {yAxis.label} · cutoff <span className="text-ink-soft font-medium">{yMode === 'year' ? cfg.yearFoundedCutoff : cfg.employeeCutoff}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Y axis toggle */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="flex items-center gap-2 font-sans text-[12px] text-ink-soft hover:text-ink border border-rule bg-white rounded-md px-3 py-1.5 cursor-pointer transition-colors"
              >
                <span>Y axis: <span className="font-medium text-ink">{yAxis.label}</span></span>
                <ChevronDown size={12} className="text-ink-mute" style={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-rule rounded-lg shadow-lg overflow-hidden z-30 w-48">
                  {Object.values(Y_AXES).map(a => (
                    <button
                      key={a.id}
                      onClick={() => { setYMode(a.id); setMenuOpen(false) }}
                      className="w-full text-left px-4 py-2.5 font-sans text-[12.5px] hover:bg-bg transition-colors border-0 bg-transparent cursor-pointer"
                      style={{ color: yMode === a.id ? '#15063b' : '#6a6560', fontWeight: yMode === a.id ? 600 : 400 }}
                    >
                      Funding × {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowNames(p => !p)}
              className="font-sans text-[12px] text-ink-soft hover:text-ink border border-rule bg-white rounded-md px-3 py-1.5 cursor-pointer transition-colors"
            >
              {showNames ? 'Hide names' : 'Show names'}
            </button>
          </div>
        </div>

        {/* X top labels */}
        <div className="flex items-center justify-between px-12">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-mute">Lean</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute opacity-40">← funding →</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-mute">Well-funded</span>
        </div>

        <div className="flex items-stretch gap-3" style={{ height: 440 }}>
          {/* Y label */}
          <div className="flex flex-col items-center justify-between shrink-0 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-mute" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{yAxis.high}</span>
            <span className="font-mono text-[9px] text-ink-mute opacity-40" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{yAxis.label}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-mute" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{yAxis.low}</span>
          </div>

          {/* Canvas */}
          <div
            ref={canvasRef}
            className="relative flex-1 rounded-lg border border-rule select-none overflow-hidden"
            style={{ background: '#fff' }}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            {/* cutoff lines */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-0 right-0 border-t border-dashed" style={{ borderColor: '#6a5cd6' }} />
              <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed" style={{ borderColor: '#6a5cd6' }} />
              <span className="absolute left-1/2 bottom-1 -translate-x-1/2 font-mono text-[8px] text-accent-deep bg-white/80 px-1 rounded">{fmtFunding(cfg.fundingCutoffEur)}</span>
              <span className="absolute top-1/2 left-1 -translate-y-1/2 font-mono text-[8px] text-accent-deep bg-white/80 px-1 rounded">{yMode === 'year' ? cfg.yearFoundedCutoff : cfg.employeeCutoff}</span>
            </div>

            {/* quadrant labels */}
            {[
              { key: 'tl', style: { top: '5%', left: '3%' } },
              { key: 'tr', style: { top: '5%', right: '3%' } },
              { key: 'bl', style: { bottom: '5%', left: '3%' } },
              { key: 'br', style: { bottom: '5%', right: '3%' } },
            ].map(({ key, style }) => (
              <span key={key} className="absolute font-mono text-[9px] uppercase tracking-[0.1em] text-ink-mute opacity-50" style={style}>
                {quad[key]}
              </span>
            ))}

            {plotted.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center font-sans text-[12.5px] text-ink-mute italic px-8 text-center">
                No companies have both a funding and {yAxis.label.toLowerCase()} value yet.<br />Place them manually from the tray below, or verify AI values.
              </div>
            )}

            {/* bubbles */}
            {plotted.map(co => {
              const colors = co.focal ? COLORS.focal : COLORS.default
              const size = co.focal ? 16 : 13
              const half = size / 2
              const labelRight = co.x > 50
              const labelBelow = co.y < 50
              return (
                <div
                  key={co.id}
                  onMouseDown={(e) => { e.preventDefault(); draggingRef.current = co.id }}
                  className="absolute cursor-grab active:cursor-grabbing"
                  style={{ left: `calc(${co.x}% - ${half}px)`, top: `calc(${co.y}% - ${half}px)`, zIndex: 10 }}
                  title={`${co.name} · ${fmtFunding(co.fund)} · ${yValueLabel(co, yAxis)}`}
                >
                  <div className="rounded-full" style={{ width: size, height: size, background: colors.bg, border: `2px solid ${colors.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }} />
                  {co.state === 'manual' && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: '#c08a3a' }} title="Manually placed" />
                  )}
                  {showNames && (
                    <div
                      className="absolute font-sans text-[10px] font-medium whitespace-nowrap pointer-events-none"
                      style={{
                        color: co.focal ? '#d0492b' : '#3a3a3a',
                        ...(labelBelow ? { top: size + 2 } : { bottom: size + 2 }),
                        ...(labelRight ? { right: 0 } : { left: 0 }),
                      }}
                    >
                      {co.name}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 px-12 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-ink" />
            <span className="font-sans text-[11.5px] text-ink-soft">Competitor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#8b80e6' }} />
            <span className="font-sans text-[11.5px] text-ink-soft">Focal company</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: '#c08a3a' }} />
            <span className="font-sans text-[11.5px] text-ink-soft">Manually placed</span>
          </div>
          <span className="font-sans text-[11px] text-ink-mute italic ml-auto">Drag any point to reposition</span>
        </div>

        {/* Off-matrix tray */}
        <div className="mt-2 border-t border-rule pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Hand size={13} className="text-ink-mute" />
            <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-ink-mute">
              Not on the matrix · {offMatrix.length}
            </span>
          </div>
          {offMatrix.length === 0 ? (
            <p className="font-sans text-[12px] text-ink-mute italic">Every company is positioned.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {offMatrix.map(co => {
                const missingFund = co.fund == null
                const missingY = co.yVal == null
                const unverified = co.state === 'unverified'
                return (
                  <div key={co.id} className="flex items-center justify-between gap-3 bg-white border border-rule rounded-md px-3 py-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-sans text-[12.5px] font-medium text-ink truncate">{co.name}</span>
                        {co.focal && <span className="font-mono text-[7px] uppercase tracking-[0.05em] text-accent-deep bg-accent-soft px-1 py-0.5 rounded border border-accent-soft shrink-0">focal</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {unverified ? (
                          <span className="flex items-center gap-1 font-sans text-[10.5px] text-accent-deep">
                            <AlertCircle size={10} /> AI values — verify to plot
                          </span>
                        ) : (
                          <span className="font-sans text-[10.5px] text-ink-mute">
                            Missing {[missingFund && 'funding', missingY && yAxis.label.toLowerCase()].filter(Boolean).join(' & ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {unverified && (
                        <button
                          onClick={() => setVerified(v => ({ ...v, [co.id]: true }))}
                          className="flex items-center gap-1 font-sans text-[11px] font-medium px-2 py-1 rounded border border-rule bg-white text-ink-soft hover:text-ink hover:border-ink-mute transition-all cursor-pointer"
                          title="Confirm AI-extracted values"
                        >
                          <ShieldCheck size={11} className="text-good" /> Verify
                        </button>
                      )}
                      {missingY && yAxis.id === 'year' && !collected[co.id]?.notFound && (
                        <button
                          onClick={() => collect(co.id)}
                          disabled={collecting[co.id]}
                          className="flex items-center gap-1 font-sans text-[11px] font-medium px-2 py-1 rounded border border-rule bg-white text-ink-soft hover:text-ink hover:border-ink-mute transition-all cursor-pointer disabled:opacity-50"
                          title="Look up founding year in official business registries (data.gouv.fr / Companies House)"
                        >
                          {collecting[co.id] ? <Loader2 size={11} className="animate-spin" /> : <Database size={11} className="text-accent" />}
                          {collecting[co.id] ? 'Collecting…' : 'Collect founded'}
                        </button>
                      )}
                      {collected[co.id]?.notFound && (
                        <span className="font-sans text-[10px] text-ink-mute italic">no registry match</span>
                      )}
                      <button
                        onClick={() => placeManually(co.id)}
                        className="font-sans text-[11px] font-medium px-2 py-1 rounded border border-rule bg-white text-ink-soft hover:text-ink hover:border-ink-mute transition-all cursor-pointer"
                      >
                        Place manually
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {Object.keys(manual).length > 0 && (
            <button
              onClick={() => setManual({})}
              className="mt-3 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer"
            >
              Reset manual placements
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
