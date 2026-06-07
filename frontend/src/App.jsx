import { useState, useRef, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import { PanelLeftOpen } from 'lucide-react'
import SectorCanvas from './components/SectorCanvas'
import SeedScreen from './components/SeedScreen'
import WorkspaceView from './components/WorkspaceView'
import LandingPage from './components/LandingPage'
import ConceptMemo from './components/ConceptMemo'
import CrmView from './components/CrmView'
import { getSectors } from './api/client'

export default function App() {
  const [sectors, setSectors] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [selected, setSelected] = useState(null)
  const sidebarRef = useRef(null)
  const [conceptOpen, setConceptOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    getSectors()
      .then(setSectors)
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const getSector = (id) => sectors.find(s => s.id === id)
  const getSegment = (sectorId, segId) => getSector(sectorId)?.segments.find(w => w.id === segId)

  const startNewSector = () => setSelected({ type: 'newSector' })

  // After a competitor CSV upload builds a Sector: refetch and open it.
  const handleSectorCreated = async (created) => {
    try {
      const data = await getSectors()
      setSectors(data)
      setSelected({ type: 'sector', id: created.id })
    } catch (e) {
      setLoadError(e.message)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {conceptOpen && <ConceptMemo onClose={() => setConceptOpen(false)} />}

      {/* Concept button — always top-right */}
      <button
        onClick={() => setConceptOpen(true)}
        className="fixed top-4 right-5 z-40 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-mute hover:text-ink border border-rule bg-bg-card hover:border-ink-mute px-3 py-1.5 rounded transition-all cursor-pointer"
      >
        Concept
      </button>

      {/* Sidebar — slides in/out */}
      <div style={{ width: sidebarOpen ? 264 : 0, transition: 'width 0.22s ease', overflow: 'hidden', flexShrink: 0 }}>
        <Sidebar ref={sidebarRef} selected={selected} onSelect={setSelected} sectors={sectors} setSectors={setSectors} onCollapse={() => setSidebarOpen(false)} onHome={() => setSelected(null)} />
      </div>

      {/* Expand button — only when sidebar is hidden */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 p-1.5 rounded-md bg-bg-card border border-rule text-ink-mute hover:text-ink hover:border-ink-mute transition-all cursor-pointer"
          title="Open sidebar"
        >
          <PanelLeftOpen size={15} />
        </button>
      )}

      <div className="flex-1 flex min-w-0">

        {!selected && (
          loading ? (
            <div className="flex-1 flex items-center justify-center font-sans text-[13px] text-ink-mute">Loading…</div>
          ) : (
            <LandingPage
              sectors={sectors}
              onSelect={setSelected}
              onNewSector={startNewSector}
              onOpenCrm={() => setSelected({ type: 'crm' })}
              loadError={loadError}
            />
          )
        )}

        {selected?.type === 'crm' && <CrmView onAnalysed={handleSectorCreated} />}

        {selected?.type === 'newSector' && (
          <SeedScreen
            sector={null}
            onCreated={handleSectorCreated}
            onCancel={() => setSelected(null)}
          />
        )}

        {selected?.type === 'sector' && (
          <SectorCanvas
            sector={getSector(selected.id)}
            onSelect={setSelected}
            onSectorUpdated={(s) => setSectors(prev => prev.map(x => x.id === s.id ? { ...x, ...s } : x))}
          />
        )}

        {selected?.type === 'workspace' && (() => {
          const sector = getSector(selected.sectorId)
          const segment = getSegment(selected.sectorId, selected.id)
          if (!segment) return null
          return <WorkspaceView workspace={segment} sector={sector} />
        })()}

        {selected?.type === 'company' && (
          <div className="flex-1 flex items-center justify-center text-ink-mute font-sans text-[13px] italic">
            Company view — coming next
          </div>
        )}

      </div>

    </div>
  )
}
