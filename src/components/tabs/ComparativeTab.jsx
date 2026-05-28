import { useState, useRef, useCallback } from 'react'
import { Pencil, ChevronDown, Sparkles } from 'lucide-react'

const COLORS = {
  focal: { bg: '#f2a58e', border: '#e8896e', text: '#fff' },
  default: { bg: '#1a1a1a', border: '#1a1a1a', text: '#fff' },
}

const DEFAULT_POSITIONS = [
  { x: 68, y: 22 }, { x: 72, y: 48 }, { x: 58, y: 35 },
  { x: 35, y: 62 }, { x: 20, y: 40 }, { x: 45, y: 75 },
  { x: 80, y: 70 }, { x: 25, y: 20 },
]

const FUND_ROUND_SIZE = {
  'Pre-seed': 8, 'Seed': 9, 'Series A': 11,
  'Series B': 14, 'Series C': 17, 'Series D': 20, 'Series D+': 22,
}

const AXIS_PRESETS = [
  { x: { low: 'Niche', high: 'Broad' },          y: { low: 'Early', high: 'Mature' } },
  { x: { low: 'Product-led', high: 'Sales-led' }, y: { low: 'SMB', high: 'Enterprise' } },
  { x: { low: 'Local', high: 'Global' },          y: { low: 'Thin', high: 'Deep tech' } },
  { x: { low: 'Low price', high: 'Premium' },     y: { low: 'Early adopter', high: 'Mass market' } },
]

const SIZE_METRICS = [
  { id: 'none',      label: 'Equal size' },
  { id: 'priority',  label: 'Priority score' },
  { id: 'fundRound', label: 'Funding round' },
  { id: 'founded',   label: 'Company age' },
]

const CLUSTER_STROKE = 'rgba(150,140,128,0.3)'
const CLUSTER_FILL = 'rgba(150,140,128,0.05)'

function cross(O, A, B) {
  return (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x)
}

function convexHull(pts) {
  if (pts.length < 2) return pts
  const sorted = [...pts].sort((a, b) => a.x - b.x || a.y - b.y)
  const lower = [], upper = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length-2], lower[lower.length-1], p) <= 0) lower.pop()
    lower.push(p)
  }
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i]
    while (upper.length >= 2 && cross(upper[upper.length-2], upper[upper.length-1], p) <= 0) upper.pop()
    upper.push(p)
  }
  upper.pop(); lower.pop()
  return [...lower, ...upper]
}

function expandHull(hull, pad) {
  const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length
  const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length
  return hull.map(p => {
    const dx = p.x - cx, dy = p.y - cy
    const d = Math.hypot(dx, dy) || 1
    return { x: p.x + (dx / d) * pad, y: p.y + (dy / d) * pad }
  })
}

function smoothClosedPath(pts) {
  const n = pts.length
  if (n < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < n; i++) {
    const p1 = pts[i], p2 = pts[(i + 1) % n]
    const p0 = pts[(i - 1 + n) % n], p3 = pts[(i + 2) % n]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }
  return d + ' Z'
}

// DBSCAN: returns array of groups (arrays of points); unclustered points are omitted
function dbscan(points, eps = 13, minPts = 2) {
  const visited = new Set()
  const clusters = []

  const neighbors = (p) => points.filter(q => Math.hypot(p.x - q.x, p.y - q.y) <= eps)

  for (const point of points) {
    if (visited.has(point)) continue
    visited.add(point)
    const nb = neighbors(point)
    if (nb.length < minPts) continue
    const cluster = new Set(nb)
    cluster.add(point)
    const queue = [...nb]
    while (queue.length) {
      const q = queue.shift()
      if (!visited.has(q)) {
        visited.add(q)
        const qn = neighbors(q)
        if (qn.length >= minPts) qn.forEach(n => { if (!cluster.has(n)) { cluster.add(n); queue.push(n) } })
      }
    }
    clusters.push([...cluster])
  }
  return clusters
}

function getBubbleSize(metric, player) {
  const base = 10
  switch (metric) {
    case 'priority':
      return player.priority ? 6 + player.priority * 3 : base
    case 'fundRound': {
      const size = FUND_ROUND_SIZE[player.fundRound]
      return size || base
    }
    case 'founded': {
      if (!player.founded) return base
      const age = new Date().getFullYear() - parseInt(player.founded)
      return Math.min(22, Math.max(7, 5 + age * 1.5))
    }
    default:
      return base
  }
}

function EditableLabel({ value, onChange, className, style }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const save = () => { onChange(draft); setEditing(false) }

  if (editing) return (
    <div style={style}>
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
        onBlur={save}
        className="bg-white border border-ink-mute rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink outline-none w-32"
      />
    </div>
  )

  return (
    <div
      className={`group flex items-center gap-1 cursor-pointer ${className}`}
      style={style}
      onClick={() => { setEditing(true); setDraft(value) }}
    >
      <span>{value}</span>
      <Pencil size={9} className="opacity-0 group-hover:opacity-50 transition-opacity" />
    </div>
  )
}

export default function ComparativeTab({ workspace }) {
  const canvasRef = useRef(null)
  const draggingRef = useRef(null)

  const [xAxis, setXAxis] = useState({ low: 'Niche', high: 'Broad' })
  const [yAxis, setYAxis] = useState({ low: 'Early', high: 'Mature' })
  const [quadrants, setQuadrants] = useState({
    tl: 'Mature Niche', tr: 'Mature Broad',
    bl: 'Early Niche',  br: 'Early Broad',
  })
  const [sizeMetric, setSizeMetric] = useState('none')
  const [sizeScale, setSizeScale] = useState(1)
  const [showNames, setShowNames] = useState(true)
  const [metricOpen, setMetricOpen] = useState(false)
  const [axisOpen, setAxisOpen] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [clustersOn, setClustersOn] = useState(false)

  const suggestAxes = () => {
    setSuggesting(true)
    setTimeout(() => { setSuggesting(false); setAxisOpen(true) }, 800)
  }

  const [positions, setPositions] = useState(() =>
    (workspace.companies || []).map((co, i) => ({
      id: co.id, name: co.name, focal: co.focal || false,
      priority: co.priority || null, fundRound: co.fundRound || '',
      founded: co.founded || '',
      x: DEFAULT_POSITIONS[i % DEFAULT_POSITIONS.length].x,
      y: DEFAULT_POSITIONS[i % DEFAULT_POSITIONS.length].y,
    }))
  )

  const [tooltip, setTooltip] = useState(null)

  const getCanvasCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100)),
    }
  }

  const onMouseDown = (e, id) => { e.preventDefault(); draggingRef.current = id }

  const onMouseMove = useCallback((e) => {
    if (!draggingRef.current) return
    const { x, y } = getCanvasCoords(e)
    setPositions(p => p.map(co => co.id === draggingRef.current ? { ...co, x, y } : co))
  }, [])

  const onMouseUp = useCallback(() => { draggingRef.current = null }, [])

  const selectedMetricLabel = SIZE_METRICS.find(m => m.id === sizeMetric)?.label

  return (
    <div className="flex-1 flex flex-col min-h-0 px-8 py-4 overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 max-w-[780px] mx-auto w-full gap-3">

        {/* Controls row */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute">Positioning map · drag to reposition</span>

          <div className="flex items-center gap-2">

            {/* Suggest axes */}
            <div className="relative">
              <button
                onClick={suggestAxes}
                disabled={suggesting}
                className="flex items-center gap-1.5 font-sans text-[12px] font-medium px-3 py-1.5 rounded-md border border-rule bg-white text-ink-soft hover:text-ink hover:border-ink-mute transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles size={11} className="text-accent" />
                {suggesting ? 'Thinking…' : 'Suggest axes'}
              </button>

              {axisOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-rule rounded-lg shadow-lg overflow-hidden z-20 w-64">
                  <div className="px-4 py-2 border-b border-rule">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">AI axis suggestions</span>
                  </div>
                  {AXIS_PRESETS.map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => { setXAxis(preset.x); setYAxis(preset.y); setAxisOpen(false) }}
                      className="w-full text-left px-4 py-3 font-sans text-[12px] hover:bg-bg transition-colors border-0 bg-transparent cursor-pointer border-b border-rule last:border-b-0"
                    >
                      <span className="font-medium text-ink">{preset.x.low} → {preset.x.high}</span>
                      <span className="text-ink-mute mx-1.5">×</span>
                      <span className="font-medium text-ink">{preset.y.low} → {preset.y.high}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Size metric dropdown */}
            <div className="relative">
              <button
                onClick={() => setMetricOpen(p => !p)}
                className="flex items-center gap-2 font-sans text-[12px] text-ink-soft hover:text-ink border border-rule bg-white rounded-md px-3 py-1.5 cursor-pointer transition-colors"
              >
                <span>Size by: <span className="font-medium text-ink">{selectedMetricLabel}</span></span>
                <ChevronDown size={12} className="text-ink-mute" style={{ transform: metricOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              {metricOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-rule rounded-lg shadow-lg overflow-hidden z-20 w-44">
                  {SIZE_METRICS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setSizeMetric(m.id); setMetricOpen(false) }}
                      className="w-full text-left px-4 py-2.5 font-sans text-[12.5px] hover:bg-bg transition-colors border-0 bg-transparent cursor-pointer"
                      style={{ color: sizeMetric === m.id ? '#1a1a1a' : '#6a6560', fontWeight: sizeMetric === m.id ? 600 : 400 }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* X axis top labels */}
        <div className="flex items-center justify-between px-10">
          <EditableLabel value={xAxis.low} onChange={v => setXAxis(p => ({ ...p, low: v }))}
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-mute" />
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute opacity-40">← x axis →</span>
          <EditableLabel value={xAxis.high} onChange={v => setXAxis(p => ({ ...p, high: v }))}
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-mute" />
        </div>

        <div className="flex items-stretch gap-3 flex-1 min-h-0">

          {/* Y axis label */}
          <div className="flex flex-col items-center justify-between shrink-0 py-2">
            <EditableLabel value={yAxis.high} onChange={v => setYAxis(p => ({ ...p, high: v }))}
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-mute"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} />
            <span className="font-mono text-[9px] text-ink-mute opacity-40" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>↕</span>
            <EditableLabel value={yAxis.low} onChange={v => setYAxis(p => ({ ...p, low: v }))}
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-mute"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} />
          </div>


          {/* Canvas */}
          <div
            ref={canvasRef}
            className="relative flex-1 min-h-0 rounded-lg border border-rule select-none overflow-hidden"
            style={{ background: '#ffffff', cursor: draggingRef.current ? 'grabbing' : 'default' }}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            {/* Cluster regions — SVG overlay */}
            {clustersOn && (() => {
              const groups = dbscan(positions)
              return (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  style={{ zIndex: 5 }}
                >
                  {groups.map((group, i) => {
                    if (group.length === 1) {
                      return (
                        <circle key={i}
                          cx={group[0].x} cy={group[0].y} r={6}
                          fill={CLUSTER_FILL} stroke={CLUSTER_STROKE}
                          strokeWidth="0.3" strokeDasharray="1.5,1.2"
                        />
                      )
                    }
                    const hull = convexHull(group)
                    const expanded = expandHull(hull, 5)
                    const d = smoothClosedPath(expanded)
                    return (
                      <path key={i} d={d}
                        fill={CLUSTER_FILL} stroke={CLUSTER_STROKE}
                        strokeWidth="0.3" strokeDasharray="1.5,1.2"
                      />
                    )
                  })}
                </svg>
              )
            })()}

            {/* Grid lines */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-0 right-0 border-t border-rule" />
              <div className="absolute left-1/2 top-0 bottom-0 border-l border-rule" />
            </div>

            {/* Quadrant labels */}
            {[
              { key: 'tl', style: { top: '4%', left: '3%' } },
              { key: 'tr', style: { top: '4%', right: '3%' } },
              { key: 'bl', style: { bottom: '4%', left: '3%' } },
              { key: 'br', style: { bottom: '4%', right: '3%' } },
            ].map(({ key, style }) => (
              <div key={key} className="absolute pointer-events-auto" style={style}>
                <EditableLabel
                  value={quadrants[key]}
                  onChange={v => setQuadrants(p => ({ ...p, [key]: v }))}
                  className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-mute opacity-40 hover:opacity-70 transition-opacity"
                />
              </div>
            ))}

            {/* Company bubbles */}
            {positions.map(co => {
              const colors = co.focal ? COLORS.focal : COLORS.default
              const size = getBubbleSize(sizeMetric, co) * sizeScale
              const half = size / 2
              // Place label away from chart center to reduce collisions
              const labelRight = co.x > 50
              const labelBelow = co.y < 50

              return (
                <div
                  key={co.id}
                  onMouseDown={e => onMouseDown(e, co.id)}
                  className="absolute cursor-grab active:cursor-grabbing"
                  style={{
                    left: `calc(${co.x}% - ${half}px)`,
                    top: `calc(${co.y}% - ${half}px)`,
                    zIndex: tooltip === co.id ? 20 : 10,
                  }}
                >
                  <div
                    className="rounded-full"
                    style={{
                      width: size,
                      height: size,
                      background: colors.bg,
                      border: `2px solid ${colors.border}`,
                      boxShadow: tooltip === co.id ? '0 4px 14px rgba(0,0,0,0.18)' : '0 1px 4px rgba(0,0,0,0.08)',
                      transition: 'width 0.2s ease, height 0.2s ease, box-shadow 0.15s ease',
                    }}
                    onMouseEnter={() => setTooltip(co.id)}
                    onMouseLeave={() => setTooltip(null)}
                  />

                  {showNames && (
                    <div
                      className="absolute font-sans text-[10px] font-medium whitespace-nowrap pointer-events-none"
                      style={{
                        color: co.focal ? '#f2a58e' : '#3a3a3a',
                        ...(labelBelow
                          ? { top: size + 2 }
                          : { bottom: size + 2 }),
                        ...(labelRight
                          ? { right: 0 }
                          : { left: 0 }),
                      }}
                    >
                      {co.name}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Axis side panel */}
          <div className="w-44 shrink-0 flex flex-col gap-4 overflow-y-auto py-1">

            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute mb-2">X axis</div>
              <div className="flex flex-col gap-1">
                {AXIS_PRESETS.map((preset, i) => {
                  const active = xAxis.low === preset.x.low && xAxis.high === preset.x.high
                  return (
                    <button
                      key={i}
                      onClick={() => setXAxis(preset.x)}
                      className="text-left px-3 py-2 rounded-md font-sans text-[11.5px] border cursor-pointer transition-all"
                      style={active
                        ? { background: '#1a1a1a', color: '#fff', borderColor: '#1a1a1a' }
                        : { background: '#fff', color: '#6a6560', borderColor: '#d8d2c5' }
                      }
                    >
                      {preset.x.low} → {preset.x.high}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute mb-2">Y axis</div>
              <div className="flex flex-col gap-1">
                {AXIS_PRESETS.map((preset, i) => {
                  const active = yAxis.low === preset.y.low && yAxis.high === preset.y.high
                  return (
                    <button
                      key={i}
                      onClick={() => setYAxis(preset.y)}
                      className="text-left px-3 py-2 rounded-md font-sans text-[11.5px] border cursor-pointer transition-all"
                      style={active
                        ? { background: '#1a1a1a', color: '#fff', borderColor: '#1a1a1a' }
                        : { background: '#fff', color: '#6a6560', borderColor: '#d8d2c5' }
                      }
                    >
                      {preset.y.low} → {preset.y.high}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Display controls */}
            <div className="pt-3 border-t border-rule flex flex-col gap-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">Display</div>

              <div className="flex items-center justify-between">
                <span className="font-sans text-[11.5px] text-ink-soft">Names</span>
                <button
                  onClick={() => setShowNames(p => !p)}
                  className="relative rounded-full border-0 cursor-pointer transition-colors shrink-0"
                  style={{ background: showNames ? '#1a1a1a' : '#d8d2c5', width: 32, height: 18 }}
                >
                  <span className="absolute top-0.5 rounded-full bg-white"
                    style={{ width: 14, height: 14, left: showNames ? 16 : 2, transition: 'left 0.2s ease' }} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-sans text-[11.5px] text-ink-soft">Clusters</span>
                <button
                  onClick={() => setClustersOn(p => !p)}
                  className="relative rounded-full border-0 cursor-pointer transition-colors shrink-0"
                  style={{ background: clustersOn ? '#1a1a1a' : '#d8d2c5', width: 32, height: 18 }}
                >
                  <span className="absolute top-0.5 rounded-full bg-white"
                    style={{ width: 14, height: 14, left: clustersOn ? 16 : 2, transition: 'left 0.2s ease' }} />
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-sans text-[11.5px] text-ink-soft">Scale</span>
                  <span className="font-mono text-[9px] text-ink-mute">{sizeScale.toFixed(1)}×</span>
                </div>
                <input
                  type="range" min="0.4" max="2.2" step="0.05"
                  value={sizeScale}
                  onChange={e => setSizeScale(parseFloat(e.target.value))}
                  className="w-full cursor-pointer"
                />
              </div>
            </div>

          </div>

        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 px-10">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-ink shrink-0" />
            <span className="font-sans text-[11.5px] text-ink-soft">Competitor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: '#f2a58e' }} />
            <span className="font-sans text-[11.5px] text-ink-soft">Focal company</span>
          </div>
          {sizeMetric !== 'none' && (
            <span className="font-sans text-[11px] text-ink-mute italic ml-auto">
              Bubble size = {selectedMetricLabel?.toLowerCase()}
            </span>
          )}
        </div>

      </div>
    </div>
  )
}
