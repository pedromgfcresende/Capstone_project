import { useMemo, useState } from 'react'
import { ExternalLink, Link2, FileText, Sparkles, RefreshCw } from 'lucide-react'
import { VerifyDot, VerifyLegend, useVerifyMap } from '../VerifyDot'
import { collectSegmentSources } from '../../api/client'

// ── Sources ───────────────────────────────────────────────────────────────────
// Direct links only — the specific public pages where each company's data was
// collected (homepage, registry record, Dealroom/Crunchbase profile, news/source
// URLs from AI research). No generic industry directories.

const domainOf = (url) => {
  try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '') }
  catch { return url }
}
const toHref = (url) => (url.startsWith('http') ? url : `https://${url}`)

// pull every direct link attached to a company (handles both source shapes:
// plain URL strings from AI research, and {url,name,field} from registry collect)
function companySources(co) {
  const ex = co.extra || {}
  const out = []
  const site = ex.website || ex.Website || ex.domain || ex.homepage
  if (site) out.push({ url: site, label: 'Homepage', field: 'homepage' })
  for (const s of ex.sources || []) {
    if (typeof s === 'string') out.push({ url: s, label: domainOf(s), field: null })
    else if (s && s.url) out.push({ url: s.url, label: s.name || domainOf(s.url), field: s.field })
  }
  const seen = new Set()
  return out.filter(s => s.url && !seen.has(s.url) && seen.add(s.url))
}

export default function SourcesTab({ workspace, onReload }) {
  const verify = useVerifyMap()
  const [collecting, setCollecting] = useState(false)
  const withSources = useMemo(
    () => (workspace.companies || [])
      .map(co => ({ co, sources: companySources(co) }))
      .filter(x => x.sources.length > 0),
    [workspace.companies]
  )

  const total = withSources.reduce((n, x) => n + x.sources.length, 0)

  const collect = async () => {
    setCollecting(true)
    try { await collectSegmentSources(workspace.id); onReload?.() }
    finally { setCollecting(false) }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-bg">
      {/* Header */}
      <div className="flex items-center justify-between gap-6 px-8 py-4 border-b border-rule bg-bg-card shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <Link2 size={14} className="text-accent" />
          <span className="font-mono text-[10px] uppercase tracking-[0.13em] text-ink-soft">Sources · direct links</span>
          <span className="font-mono text-[10px] text-ink-mute">· {total} link{total !== 1 ? 's' : ''} across {withSources.length} compan{withSources.length === 1 ? 'y' : 'ies'}</span>
        </div>
        <div className="flex items-center gap-3">
          <VerifyLegend />
          <button
            onClick={collect}
            disabled={collecting}
            title="Deep-research direct source links for every company in this segment"
            className="flex items-center gap-1.5 font-sans text-[11.5px] font-medium px-2.5 py-1.5 rounded-md border border-rule bg-white text-ink-soft hover:text-ink hover:border-ink-mute transition-all cursor-pointer disabled:opacity-50"
          >
            {collecting ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} className="text-accent" />}
            {collecting ? 'Researching…' : 'Collect sources'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {withSources.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center max-w-[460px] mx-auto">
            <FileText size={20} className="text-ink-mute" />
            <div className="font-sans text-[13px] text-ink-soft">No direct sources collected yet.</div>
            <div className="font-sans text-[12px] text-ink-mute leading-relaxed">
              Direct per-company links appear here once a company is AI-researched
              (“Find competitors”) or its founding data is collected from a registry.
              Verify each link before relying on the value it backs.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-[820px] mx-auto">
            {withSources.map(({ co, sources }) => (
              <div key={co.id} className="bg-white border border-rule rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-rule bg-bg-card">
                  <span className="font-sans text-[13px] font-semibold text-ink">{co.name}</span>
                  {co.focal && <span className="font-mono text-[7.5px] uppercase tracking-[0.05em] text-accent-deep bg-accent-soft px-1.5 py-0.5 rounded border border-accent-soft">focal</span>}
                  <span className="font-mono text-[8px] uppercase tracking-[0.05em] text-ink-mute bg-bg px-1.5 py-0.5 rounded border border-rule">{co.origin === 'ai' ? 'AI-found' : co.origin}</span>
                  <span className="font-mono text-[9px] text-ink-mute ml-auto">{sources.length} link{sources.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-rule">
                  {sources.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg transition-colors">
                      <VerifyDot status={verify.get(`${co.id}:${i}`)} onClick={() => verify.cycle(`${co.id}:${i}`)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-sans text-[12.5px] text-ink truncate">{s.label}</span>
                          {s.field && <span className="font-mono text-[8px] uppercase tracking-[0.05em] text-ink-mute bg-bg px-1 py-0.5 rounded border border-rule shrink-0">{s.field}</span>}
                        </div>
                        <a href={toHref(s.url)} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-accent-deep hover:underline truncate block">
                          {s.url.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                      <a href={toHref(s.url)} target="_blank" rel="noopener noreferrer" className="shrink-0 text-ink-mute hover:text-accent transition-colors" title="Open source">
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
