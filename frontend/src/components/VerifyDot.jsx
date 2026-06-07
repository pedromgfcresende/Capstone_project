import { useState } from 'react'

// Shared fact-verification status used anywhere a claim is surfaced.
// AI-generated (grey) → human-verified (green) → needs verification (red).
export const VERIFY = {
  ai:       { color: '#b8b2a8', label: 'AI-generated' },
  verified: { color: '#2d6a3f', label: 'Human-verified' },
  needs:    { color: '#d0492b', label: 'Needs verification' },
}
export const VERIFY_ORDER = ['ai', 'verified', 'needs']
const next = (s) => VERIFY_ORDER[(VERIFY_ORDER.indexOf(s) + 1) % VERIFY_ORDER.length]

export function VerifyDot({ status = 'ai', onClick, size = 8 }) {
  const v = VERIFY[status] || VERIFY.ai
  return (
    <button
      onClick={onClick}
      title={`${v.label} — click to change`}
      className="shrink-0 rounded-full border-0 p-0 cursor-pointer hover:scale-125 transition-transform"
      style={{ width: size, height: size, background: v.color }}
    />
  )
}

export function VerifyLegend() {
  return (
    <div className="flex items-center gap-3.5">
      {VERIFY_ORDER.map(k => (
        <div key={k} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: VERIFY[k].color }} />
          <span className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-ink-mute">{VERIFY[k].label}</span>
        </div>
      ))}
    </div>
  )
}

// Manage verification status for many keyed items in one section.
export function useVerifyMap(initial = {}) {
  const [map, setMap] = useState(initial)
  const get = (key) => map[key] || 'ai'
  const cycle = (key) => setMap(p => ({ ...p, [key]: next(p[key] || 'ai') }))
  return { get, cycle }
}
