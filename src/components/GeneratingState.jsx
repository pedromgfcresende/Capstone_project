import { useEffect, useState } from 'react'

const steps = [
  'Identifying players…',
  'Translating positioning…',
  'Mapping competitive dimensions…',
  'Structuring commentary…',
  'Building exec summary…',
]

export default function GeneratingState({ workspace, onDone }) {
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => {
        if (s >= steps.length - 1) {
          clearInterval(interval)
          setTimeout(() => { setDone(true); onDone() }, 600)
          return s
        }
        return s + 1
      })
    }, 700)
    return () => clearInterval(interval)
  }, [onDone])

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg gap-6">
      <div className="flex flex-col items-center gap-4">

        {/* Animated mark */}
        <div className="relative w-10 h-10">
          <div
            className="w-10 h-10 rounded-md bg-accent"
            style={{
              animation: 'pulse 1.2s ease-in-out infinite',
              transform: 'rotate(-8deg)',
            }}
          />
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: rotate(-8deg) scale(1); }
              50% { opacity: 0.7; transform: rotate(-8deg) scale(0.92); }
            }
          `}</style>
        </div>

        <div className="text-center">
          <div className="font-serif text-[18px] font-semibold text-ink mb-1">
            Mapping {workspace.title}
          </div>
          <div
            className="font-sans text-[13px] text-ink-mute transition-all duration-300"
            style={{ opacity: done ? 0 : 1 }}
          >
            {steps[step]}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-[280px] h-[3px] bg-rule rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-700 ease-out"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
