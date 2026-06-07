import { useState, useRef } from 'react'
import { Sparkles, X, Upload, FileText, RefreshCw, ArrowLeft } from 'lucide-react'
import { uploadCompetitor } from '../api/client'

// Week 2: a workspace is created by uploading a competitor-analysis CSV.
export default function SeedScreen({ workspace, sector, onCreated, onCancel }) {
  const [title, setTitle] = useState(workspace?.title || '')
  const [sectorLabel, setSectorLabel] = useState(sector?.label || '')
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const canSubmit = title.trim() && sectorLabel.trim() && file && !busy

  const handleFiles = (incoming) => {
    const f = incoming?.[0]
    if (f) { setFile(f); setError(null) }
  }

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true); setError(null)
    try {
      const { workspace: created } = await uploadCompetitor({
        file,
        title: title.trim(),
        sectorLabel: sectorLabel.trim() || 'Uncategorised',
      })
      onCreated?.(created)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-bg">
      {/* Header */}
      <div className="flex items-center gap-3 px-8 py-4 border-b border-rule bg-bg-card shrink-0">
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-1.5 rounded-md text-ink-mute hover:text-ink hover:bg-black/5 border-0 bg-transparent cursor-pointer transition-colors shrink-0"
            title="Back"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <div>
          <div className="font-mono text-[9px] text-ink-mute uppercase tracking-[0.15em] mb-1">
            New workspace
          </div>
          <h1 className="font-serif text-[20px] font-semibold tracking-tight text-ink">
            Build a competitive landscape
          </h1>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-10 py-8">
        <div className="max-w-[680px] mx-auto flex flex-col gap-4">

          <p className="font-sans text-[13px] text-ink-mute leading-relaxed">
            Upload a competitor-analysis CSV (Name, Founded, HQ, Funding, Segment, Notes…).
            Each upload becomes one workspace; the focal company is the row with no competitive-potential tier.
          </p>

          {/* Title */}
          <div className="bg-white border border-rule rounded-lg px-6 py-5">
            <label className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute font-semibold block mb-3">
              Workspace title <span className="text-accent">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AI Agents for Financial Services"
              className="w-full bg-transparent border-0 outline-none font-sans text-[14px] text-ink placeholder:text-ink-mute"
            />
          </div>

          {/* Sector */}
          <div className="bg-white border border-rule rounded-lg px-6 py-5">
            <label className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute font-semibold block mb-3">
              Sector <span className="text-accent">*</span>
            </label>
            <input
              type="text"
              value={sectorLabel}
              onChange={(e) => setSectorLabel(e.target.value)}
              placeholder="e.g. AI in Financial Services (existing sectors are reused by name)"
              className="w-full bg-transparent border-0 outline-none font-sans text-[14px] text-ink placeholder:text-ink-mute"
            />
          </div>

          {/* File dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg px-5 py-8 flex items-center gap-3 cursor-pointer transition-all"
            style={{
              borderColor: dragging ? '#e85d3b' : '#d8d2c5',
              background: dragging ? '#fce6dc' : '#fff',
            }}
          >
            <Upload size={18} className="text-ink-mute shrink-0" />
            <div className="flex-1">
              <div className="font-sans text-[13px] text-ink-soft">
                {file ? 'Replace the CSV' : 'Drag and drop a competitor-analysis CSV, or click to browse'}
              </div>
              <div className="font-sans text-[11px] text-ink-mute">.csv only</div>
            </div>
            {file && (
              <span className="flex items-center gap-1.5 font-sans text-[12px] bg-bg border border-rule px-2.5 py-1 rounded-full text-ink">
                <FileText size={11} className="text-ink-mute" />
                {file.name}
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  className="text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer p-0"
                >
                  <X size={11} />
                </button>
              </span>
            )}
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </div>

          {error && (
            <div className="font-sans text-[12px] text-accent-deep bg-accent-soft border border-accent-soft rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={!canSubmit}
            className="self-start flex items-center gap-2 px-7 py-3.5 rounded-lg font-sans text-[13.5px] font-semibold transition-all cursor-pointer border-0 mt-1"
            style={canSubmit
              ? { background: '#1a1a1a', color: '#fff' }
              : { background: '#d8d2c5', color: '#8a8580', cursor: 'not-allowed' }}
            onMouseEnter={(e) => { if (canSubmit) e.currentTarget.style.background = '#e85d3b' }}
            onMouseLeave={(e) => { if (canSubmit) e.currentTarget.style.background = '#1a1a1a' }}
          >
            {busy ? <><RefreshCw size={14} className="animate-spin" /> Creating workspace…</> : <><Sparkles size={14} /> Create workspace</>}
          </button>

        </div>
      </div>
    </div>
  )
}
