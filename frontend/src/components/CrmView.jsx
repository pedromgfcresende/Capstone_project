import { useState, useEffect, useCallback } from 'react'
import { Search, X, ExternalLink, ChevronLeft, ChevronRight, Sparkles, RefreshCw } from 'lucide-react'
import { getCrmCompanies, getCrmFacets, analyseCrmCompany } from '../api/client'

const STATUS_COLORS = {
  hot: { bg: '#d4edda', text: '#2d6a3f', label: 'Hot' },
  pass: { bg: '#f8d7da', text: '#842029', label: 'Pass' },
  unknown: { bg: '#f0ede8', text: '#8a8580', label: 'Unknown' },
}

const PAGE = 25
const fmtEur = (n) => (n == null ? '—' : n >= 1e6 ? `€${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `€${Math.round(n / 1e3)}k` : `€${n}`)

export default function CrmView({ onAnalysed }) {
  const [facets, setFacets] = useState(null)
  const [data, setData] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [country, setCountry] = useState('')
  const [q, setQ] = useState('')
  const [offset, setOffset] = useState(0)
  const [analysingId, setAnalysingId] = useState(null)
  const [analyseError, setAnalyseError] = useState(null)

  const analyse = async (id) => {
    setAnalysingId(id); setAnalyseError(null)
    try {
      const r = await analyseCrmCompany(id)
      onAnalysed?.(r.sector)
    } catch (e) {
      setAnalyseError(e.message)
    } finally {
      setAnalysingId(null)
    }
  }

  useEffect(() => { getCrmFacets().then(setFacets).catch(() => {}) }, [])

  const fetchPage = useCallback(() => {
    setLoading(true)
    getCrmCompanies({ status, country, q, limit: PAGE, offset })
      .then(setData)
      .finally(() => setLoading(false))
  }, [status, country, q, offset])

  useEffect(() => { fetchPage() }, [fetchPage])

  // reset to first page when filters change
  const onFilter = (fn) => { setOffset(0); fn() }

  const page = Math.floor(offset / PAGE) + 1
  const pages = Math.max(1, Math.ceil(data.total / PAGE))

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-bg">
      {/* Header */}
      <div className="px-8 py-4 border-b border-rule bg-bg-card shrink-0">
        <div className="font-mono text-[9px] text-ink-mute uppercase tracking-[0.15em] mb-0.5">Deal Pipeline · Affinity CRM</div>
        <h1 className="font-serif text-[20px] font-semibold tracking-tight text-ink">
          Pipeline {facets && <span className="font-sans text-[13px] font-normal text-ink-mute">· {facets.total.toLocaleString()} companies</span>}
        </h1>
      </div>

      {/* Filters */}
      <div className="px-8 py-3 border-b border-rule bg-bg-card shrink-0 flex items-center gap-3 flex-wrap">
        {/* status pills */}
        <div className="flex gap-1">
          {['', 'hot', 'pass', 'unknown'].map(s => {
            const active = status === s
            const c = STATUS_COLORS[s]
            const count = s === '' ? facets?.total : facets?.statuses?.[s]
            return (
              <button
                key={s || 'all'}
                onClick={() => onFilter(() => setStatus(s))}
                className="font-mono text-[10px] uppercase tracking-[0.06em] px-2.5 py-1 rounded border cursor-pointer transition-all"
                style={active
                  ? { background: '#15063b', color: '#fff', borderColor: '#15063b' }
                  : { background: '#fff', color: '#6a6560', borderColor: '#d8d2c5' }}
              >
                {s === '' ? 'All' : c.label}{count != null && ` · ${count}`}
              </button>
            )
          })}
        </div>

        {/* country */}
        <select
          value={country}
          onChange={(e) => onFilter(() => setCountry(e.target.value))}
          className="font-sans text-[12px] text-ink bg-white border border-rule rounded px-2.5 py-1.5 outline-none focus:border-ink-mute cursor-pointer"
        >
          <option value="">All countries</option>
          {facets?.countries?.map(c => <option key={c.value} value={c.value}>{c.value} ({c.count})</option>)}
        </select>

        {/* search */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-rule rounded focus-within:border-ink-mute transition-colors flex-1 min-w-[200px] max-w-[360px]">
          <Search size={13} className="text-ink-mute shrink-0" />
          <input
            value={q}
            onChange={(e) => onFilter(() => setQ(e.target.value))}
            placeholder="Search name or description…"
            className="flex-1 bg-transparent border-0 outline-none font-sans text-[12.5px] text-ink placeholder:text-ink-mute"
          />
          {q && <button onClick={() => onFilter(() => setQ(''))} className="text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer p-0"><X size={12} /></button>}
        </div>
      </div>

      {(analysingId || analyseError) && (
        <div className="px-8 py-2 border-b border-rule bg-bg-card shrink-0 font-sans text-[12px]"
          style={{ color: analyseError ? '#c0420c' : '#8a8580' }}>
          {analyseError ? `Analyse failed: ${analyseError}` : 'AI market research running (suggest sector + segment, then web research)… ~1 min.'}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-bg z-10">
            <tr className="border-b border-rule">
              {['Company', 'Status', 'Country', 'Stage', 'Funding', 'Owner', ''].map((h, i) => (
                <th key={i} className="text-left font-mono text-[8.5px] uppercase tracking-[0.1em] text-ink-mute px-4 py-2.5 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.map(c => {
              const sc = STATUS_COLORS[c.leadStatus] || STATUS_COLORS.unknown
              return (
                <tr key={c.id} className="border-b border-rule-soft hover:bg-bg-card transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-sans text-[12.5px] font-medium text-ink">{c.name}</span>
                      {c.website && (
                        <a href={`https://${c.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer"
                          onClick={(e) => e.stopPropagation()} className="text-ink-mute hover:text-accent">
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                    {c.industryXange && <div className="font-sans text-[10.5px] text-ink-mute">{c.industryXange}</div>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.05em] px-2 py-0.5 rounded" style={{ background: sc.bg, color: sc.text }}>{sc.label}</span>
                  </td>
                  <td className="px-4 py-2.5 font-sans text-[12px] text-ink-soft">{c.country || '—'}</td>
                  <td className="px-4 py-2.5 font-sans text-[12px] text-ink-soft">{c.investmentStage || '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-[11.5px] text-ink-soft">{fmtEur(c.totalFundingEur)}</td>
                  <td className="px-4 py-2.5 font-sans text-[11px] text-ink-mute truncate max-w-[160px]">{(c.owner || '').split('<')[0].trim() || '—'}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => analyse(c.id)}
                      disabled={analysingId !== null}
                      title="AI analyse: suggest sector + segment and research competitors"
                      className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.06em] px-2 py-1 rounded border border-rule bg-white text-ink-soft hover:text-ink hover:border-ink-mute cursor-pointer transition-all disabled:opacity-40 whitespace-nowrap"
                    >
                      {analysingId === c.id ? <><RefreshCw size={10} className="animate-spin" /> Analysing…</> : <><Sparkles size={10} /> Analyse</>}
                    </button>
                  </td>
                </tr>
              )
            })}
            {!loading && data.items.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center font-sans text-[13px] text-ink-mute italic">No companies match these filters.</td></tr>
            )}
          </tbody>
        </table>
        {loading && <div className="px-4 py-6 text-center font-sans text-[12px] text-ink-mute">Loading…</div>}
      </div>

      {/* Pagination */}
      <div className="px-8 py-3 border-t border-rule bg-bg-card shrink-0 flex items-center justify-between">
        <span className="font-mono text-[10px] text-ink-mute">
          {data.total === 0 ? '0' : `${offset + 1}–${Math.min(offset + PAGE, data.total)}`} of {data.total.toLocaleString()}
        </span>
        <div className="flex items-center gap-2">
          <button disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - PAGE))}
            className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.06em] px-2.5 py-1 rounded border border-rule bg-white text-ink-soft hover:border-ink-mute disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
            <ChevronLeft size={12} /> Prev
          </button>
          <span className="font-mono text-[10px] text-ink-mute">{page} / {pages}</span>
          <button disabled={offset + PAGE >= data.total} onClick={() => setOffset(o => o + PAGE)}
            className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.06em] px-2.5 py-1 rounded border border-rule bg-white text-ink-soft hover:border-ink-mute disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
            Next <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
