import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, X, ExternalLink, ChevronLeft, ChevronRight, Sparkles, RefreshCw, Upload, Check } from 'lucide-react'
import { getCrmCompanies, getCrmFacets, analyseCrmCompany, uploadCrmReconcile } from '../api/client'

const PAGE = 25
const fmtEur = (n) => (n == null ? '—' : n >= 1e6 ? `€${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `€${Math.round(n / 1e3)}k` : `€${n}`)

export default function CrmView({ onAnalysed }) {
  const [facets, setFacets] = useState(null)
  const [data, setData] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [country, setCountry] = useState('')
  const [q, setQ] = useState('')
  const [offset, setOffset] = useState(0)
  const [analysingId, setAnalysingId] = useState(null)
  const [analyseError, setAnalyseError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSummary, setUploadSummary] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const fileRef = useRef(null)

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

  const loadFacets = useCallback(() => { getCrmFacets().then(setFacets).catch(() => {}) }, [])
  useEffect(() => { loadFacets() }, [loadFacets])

  const fetchPage = useCallback(() => {
    setLoading(true)
    getCrmCompanies({ country, q, limit: PAGE, offset })
      .then(setData)
      .finally(() => setLoading(false))
  }, [country, q, offset])

  useEffect(() => { fetchPage() }, [fetchPage])

  const onFilter = (fn) => { setOffset(0); fn() }

  const onUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setUploadError(null); setUploadSummary(null)
    try {
      const summary = await uploadCrmReconcile(file)
      setUploadSummary(summary)
      loadFacets()
      setOffset(0)
      fetchPage()
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const page = Math.floor(offset / PAGE) + 1
  const pages = Math.max(1, Math.ceil(data.total / PAGE))

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-bg">
      {/* Header */}
      <div className="pl-8 pr-28 py-4 border-b border-rule bg-bg-card shrink-0 flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[9px] text-ink-mute uppercase tracking-[0.15em] mb-0.5">Deal Pipeline · Affinity CRM</div>
          <h1 className="font-serif text-[20px] font-semibold tracking-tight text-ink">
            Pipeline {facets && <span className="font-sans text-[13px] font-normal text-ink-mute">· {facets.total.toLocaleString()} companies</span>}
          </h1>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".csv" onChange={onUpload} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Re-upload a CRM CSV — updates Stage/Funding on known companies, adds new ones"
            className="flex items-center gap-1.5 font-sans text-[12px] font-medium px-3 py-2 rounded-md border border-rule bg-white text-ink-soft hover:text-ink hover:border-ink-mute transition-all cursor-pointer disabled:opacity-50"
          >
            {uploading ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} className="text-accent" />}
            {uploading ? 'Reconciling…' : 'Upload CSV'}
          </button>
        </div>
      </div>

      {/* Reconcile summary / error */}
      {(uploadSummary || uploadError) && (
        <div className="px-8 py-2.5 border-b border-rule shrink-0 flex items-center gap-3 bg-bg-card">
          {uploadError ? (
            <span className="font-sans text-[12.5px]" style={{ color: '#4a3fae' }}>Upload failed: {uploadError}</span>
          ) : (
            <>
              <Check size={14} className="text-good shrink-0" />
              <span className="font-sans text-[12.5px] text-ink-soft">
                Reconciled {uploadSummary.rows} rows · <b className="text-good">{uploadSummary.added}</b> added · <b style={{ color: '#4a3fae' }}>{uploadSummary.updated}</b> updated (stage/funding) · {uploadSummary.unchanged} unchanged
              </span>
              <button onClick={() => setUploadSummary(null)} className="ml-auto text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer p-0"><X size={13} /></button>
            </>
          )}
        </div>
      )}
      {uploadSummary?.changes?.length > 0 && (
        <div className="px-8 py-2 border-b border-rule shrink-0 bg-bg-card flex flex-wrap gap-2">
          {uploadSummary.changes.slice(0, 8).map((c, i) => (
            <span key={i} className="font-mono text-[10px] text-ink-soft bg-white border border-rule rounded px-2 py-1">
              {c.name}: {Object.keys(c.changed).join(', ')}
            </span>
          ))}
          {uploadSummary.changes.length > 8 && <span className="font-mono text-[10px] text-ink-mute self-center">+{uploadSummary.changes.length - 8} more</span>}
        </div>
      )}

      {/* Filters */}
      <div className="px-8 py-3 border-b border-rule bg-bg-card shrink-0 flex items-center gap-3 flex-wrap">
        <select
          value={country}
          onChange={(e) => onFilter(() => setCountry(e.target.value))}
          className="font-sans text-[12px] text-ink bg-white border border-rule rounded px-2.5 py-1.5 outline-none focus:border-ink-mute cursor-pointer"
        >
          <option value="">All countries</option>
          {facets?.countries?.map(c => <option key={c.value} value={c.value}>{c.value} ({c.count})</option>)}
        </select>

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
          style={{ color: analyseError ? '#4a3fae' : '#8a8580' }}>
          {analyseError ? `Analyse failed: ${analyseError}` : 'AI market research running (suggest sector + segment, then web research)… ~1 min.'}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-bg z-10">
            <tr className="border-b border-rule">
              {['Company', 'Country', 'Stage', 'Funding', 'Source', ''].map((h, i) => (
                <th key={i} className="text-left font-mono text-[8.5px] uppercase tracking-[0.1em] text-ink-mute px-4 py-2.5 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.map(c => (
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
                <td className="px-4 py-2.5 font-sans text-[12px] text-ink-soft">{c.country || '—'}</td>
                <td className="px-4 py-2.5 font-sans text-[12px] text-ink-soft">{c.investmentStage || '—'}</td>
                <td className="px-4 py-2.5 font-mono text-[11.5px] text-ink-soft">{fmtEur(c.totalFundingEur)}</td>
                <td className="px-4 py-2.5">
                  <span
                    title={c.source === 'ai' ? 'Added by the AI competitor analysis (locked)' : 'Imported from the uploaded CSV (locked)'}
                    className="font-mono text-[8.5px] uppercase tracking-[0.05em] px-2 py-0.5 rounded border"
                    style={c.source === 'ai'
                      ? { background: '#e9e7fb', color: '#4a3fae', borderColor: '#d8d4f5' }
                      : { background: '#f0ede8', color: '#8a8580', borderColor: '#e0dace' }}
                  >
                    {c.source === 'ai' ? 'AI added' : 'CSV'}
                  </span>
                </td>
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
            ))}
            {!loading && data.items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center font-sans text-[13px] text-ink-mute italic">No companies match these filters.</td></tr>
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
