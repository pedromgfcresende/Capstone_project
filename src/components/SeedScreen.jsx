import { useState, useRef } from 'react'
import { Sparkles, Plus, X, Upload, FileText } from 'lucide-react'

function TagInput({ placeholder, tags, onAdd, onRemove }) {
  const [val, setVal] = useState('')
  const commit = () => {
    const name = val.trim()
    if (name && !tags.includes(name)) onAdd(name)
    setVal('')
  }
  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commit() }
            if (e.key === ',') { e.preventDefault(); commit() }
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-0 outline-none font-sans text-[13px] text-ink placeholder:text-ink-mute"
        />
        <button onClick={commit} className="shrink-0 text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer p-0">
          <Plus size={14} />
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-rule-soft">
          {tags.map(t => (
            <span key={t} className="flex items-center gap-1 font-sans text-[11.5px] bg-white border border-rule px-2.5 py-1 rounded-full text-ink">
              {t}
              <button onClick={() => onRemove(t)} className="text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer p-0 ml-0.5">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SeedScreen({ workspace, sector, onGenerate }) {
  const [description, setDescription] = useState('')
  const [thesis, setThesis] = useState('')
  const [tracked, setTracked] = useState([])
  const [players, setPlayers] = useState([])
  const [files, setFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleFiles = (incoming) => {
    setFiles(p => {
      const names = new Set(p.map(f => f.name))
      return [...p, ...Array.from(incoming).filter(f => !names.has(f.name))]
    })
  }

  const canGenerate = description.trim().length > 0

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-bg">

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-rule bg-bg-card shrink-0">
        <div>
          <div className="font-mono text-[9px] text-ink-mute uppercase tracking-[0.15em] mb-1">
            {sector?.label} · New workspace
          </div>
          <h1 className="font-serif text-[20px] font-semibold tracking-tight text-ink">
            {workspace.title}
          </h1>
        </div>
        <div className="font-mono text-[10px] text-ink-mute">
          Last updated · {workspace.updatedAt}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-10 py-8">
        <div className="max-w-[780px] mx-auto flex flex-col gap-4">

          {/* Market description */}
          <div className="bg-white border border-rule rounded-lg px-6 py-5">
            <label className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute font-semibold block mb-3">
              Market description <span className="text-accent">*</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Analyst describes the market and seeds context for the AI layer to synthesise — the more specific, the better the cold start…"
              rows={3}
              className="w-full bg-transparent border-0 outline-none font-sans text-[13.5px] text-ink placeholder:text-ink-mute resize-none leading-relaxed"
            />
          </div>

          {/* Investment thesis or memo */}
          <div className="bg-white border border-rule rounded-lg px-6 py-5">
            <label className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute font-semibold block mb-3">
              Investment thesis or memo
            </label>
            <textarea
              value={thesis}
              onChange={e => setThesis(e.target.value)}
              placeholder="Paste a thesis, deal memo, or directional hypothesis. This anchors the commentary and differentiation read…"
              rows={3}
              className="w-full bg-transparent border-0 outline-none font-sans text-[13.5px] text-ink placeholder:text-ink-mute resize-none leading-relaxed"
            />
          </div>

          {/* Companies to track */}
          <div className="bg-white border border-rule rounded-lg px-6 py-5">
            <label className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute font-semibold block mb-3">
              Companies to track
            </label>
            <TagInput
              placeholder="Enter companies you specifically want to track — press Enter to add…"
              tags={tracked}
              onAdd={n => setTracked(p => [...p, n])}
              onRemove={n => setTracked(p => p.filter(x => x !== n))}
            />
          </div>

          {/* Known players */}
          <div className="bg-white border border-rule rounded-lg px-6 py-5">
            <label className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute font-semibold block mb-3">
              Other known players in the field
            </label>
            <TagInput
              placeholder="Add any other known players — press Enter to add…"
              tags={players}
              onAdd={n => setPlayers(p => [...p, n])}
              onRemove={n => setPlayers(p => p.filter(x => x !== n))}
            />
          </div>

          {/* Bottom row: file upload + button */}
          <div className="flex items-end gap-4 mt-1">

            {/* File upload */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 border-2 border-dashed rounded-lg px-5 py-4 flex items-center gap-3 cursor-pointer transition-all"
              style={{
                borderColor: dragging ? '#e85d3b' : '#d8d2c5',
                background: dragging ? '#fce6dc' : 'transparent',
              }}
            >
              <Upload size={16} className="text-ink-mute shrink-0" />
              <div>
                <div className="font-sans text-[12.5px] text-ink-soft">
                  Drag and drop files
                </div>
                <div className="font-sans text-[11px] text-ink-mute">memos, PDFs, CSVs</div>
              </div>
              {files.length > 0 && (
                <div className="ml-auto flex items-center gap-1.5 flex-wrap">
                  {files.map(f => (
                    <span key={f.name} className="flex items-center gap-1 font-sans text-[11px] bg-white border border-rule px-2 py-0.5 rounded-full text-ink">
                      <FileText size={10} className="text-ink-mute" />
                      {f.name.length > 16 ? f.name.slice(0, 16) + '…' : f.name}
                      <button
                        onClick={e => { e.stopPropagation(); setFiles(p => p.filter(x => x.name !== f.name)) }}
                        className="text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer p-0"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.txt,.csv,.pptx" className="hidden" onChange={e => handleFiles(e.target.files)} />
            </div>

            {/* Initiate button */}
            <button
              onClick={() => onGenerate({ description, thesis, tracked, players, files })}
              disabled={!canGenerate}
              className="shrink-0 flex items-center gap-2 px-7 py-4 rounded-lg font-sans text-[13.5px] font-semibold transition-all cursor-pointer border-0"
              style={canGenerate
                ? { background: '#1a1a1a', color: '#fff' }
                : { background: '#d8d2c5', color: '#8a8580', cursor: 'not-allowed' }
              }
              onMouseEnter={e => { if (canGenerate) e.currentTarget.style.background = '#e85d3b' }}
              onMouseLeave={e => { if (canGenerate) e.currentTarget.style.background = '#1a1a1a' }}
            >
              <Sparkles size={14} />
              Initiate the workspace
            </button>

          </div>

        </div>
      </div>
    </div>
  )
}
