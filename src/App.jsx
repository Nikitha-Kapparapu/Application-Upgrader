import React, { useState, useCallback } from 'react'
import UploadPanel from './components/UploadPanel.jsx'
import AnalysisPanel from './components/AnalysisPanel.jsx'
import ExecutionPanel from './components/ExecutionPanel.jsx'
import { STEPS, STEP_LOGS } from './components/ExecutionPanel.jsx'

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function App() {
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isRunning, setIsRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [stepStatuses, setStepStatuses] = useState({})
  const [logs, setLogs] = useState([])

  const appendLog = useCallback((line) => {
    setLogs(prev => [...prev, line])
  }, [])

  async function handleStartMigration() {
    if (isRunning) return

    setIsRunning(true)
    setIsComplete(false)
    setStepStatuses({})
    setLogs([])

    // Scroll to top so execution panel is visible
    window.scrollTo({ top: 0, behavior: 'smooth' })

    for (const step of STEPS) {
      setStepStatuses(prev => ({ ...prev, [step.key]: 'running' }))

      const stepLogs = STEP_LOGS[step.key] || []
      for (const line of stepLogs) {
        await sleep(180)
        appendLog(line)
      }

      await sleep(400)
      setStepStatuses(prev => ({ ...prev, [step.key]: 'complete' }))
      await sleep(200)
    }

    setIsRunning(false)
    setIsComplete(true)
  }

  function handleReset() {
    setUploadedFiles([])
    setStepStatuses({})
    setLogs([])
    setIsRunning(false)
    setIsComplete(false)
  }

  const headerStatus = isRunning ? 'Running' : isComplete ? 'Complete' : 'Ready'
  const headerColor = isRunning ? 'bg-amber-400' : isComplete ? 'bg-emerald-400' : 'bg-emerald-400'

  // Once migration starts, replace AnalysisPanel with ExecutionPanel in same spot
  const migrationStarted = isRunning || isComplete

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen">

      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 glow-effect">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Application Upgrader</h1>
                <p className="text-xs text-slate-400">AI-Powered Spring Migration Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {isComplete && (
                <button
                  onClick={handleReset}
                  className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1 rounded transition-all"
                >
                  New Migration
                </button>
              )}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${headerColor} animate-pulse`}></div>
                <span className="text-xs text-slate-400">{headerStatus}</span>
              </div>
              <span className="text-xs text-slate-500 border border-slate-700 px-2 py-1 rounded">v1.0.0</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Upload panel — always visible unless complete */}
        {!migrationStarted && (
          <UploadPanel onFilesUploaded={(files) => {
            setUploadedFiles(files)
            setStepStatuses({})
            setLogs([])
            setIsComplete(false)
          }} />
        )}

        {/* Before migration: show analysis + start button */}
        {/* After migration starts: replace with execution panel */}
        {!migrationStarted ? (
          <AnalysisPanel
            files={uploadedFiles}
            onStartMigration={handleStartMigration}
            isRunning={isRunning}
          />
        ) : (
          <ExecutionPanel
            isRunning={isRunning}
            isComplete={isComplete}
            stepStatuses={stepStatuses}
            logs={logs}
            onBack={() => {
              setIsRunning(false)
              setIsComplete(false)
              setStepStatuses({})
              setLogs([])
            }}
          />
        )}

      </main>

    </div>
  )
}

export default App