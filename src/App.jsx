import React, { useState, useCallback, useEffect } from 'react'
import UploadPanel from './components/UploadPanel.jsx'
import AnalysisPanel from './components/AnalysisPanel.jsx'
import ExecutionPanel from './components/ExecutionPanel.jsx'
import DiffViewer from './components/DiffViewer.jsx'
import HistoryPanel from './components/HistoryPanel.jsx'
import SettingsPanel, { getSettings } from './components/SettingsPanel.jsx'
import { STEPS, STEP_LOGS } from './components/ExecutionPanel.jsx'
import { saveSession, updateSessionStatus, getAllSessions } from './utils/database.js'

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function App() {
  const [scanResult, setScanResult]         = useState(null)
  const [isScanning, setIsScanning]         = useState(false)
  const [scanError, setScanError]           = useState('')
  const [isRunning, setIsRunning]           = useState(false)
  const [isComplete, setIsComplete]         = useState(false)
  const [stepStatuses, setStepStatuses]     = useState({})
  const [logs, setLogs]                     = useState([])
  const [sessionId, setSessionId]           = useState(null)
  const [sessionCount, setSessionCount]     = useState(0)
  const [resetKey, setResetKey]             = useState(0)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settings, setSettings]             = useState(() => getSettings())
  const [completionStats, setCompletionStats] = useState(null)

  const appendLog = useCallback((line) => {
    setLogs(prev => [...prev, line])
  }, [])

  useEffect(() => {
    getAllSessions().then(s => setSessionCount(s.length))
  }, [])

  // ─── Scan Project ──────────────────────────────────────────────────────────
  async function handleProjectScanned(projectPath) {
    setIsScanning(true)
    setScanError('')
    setScanResult(null)

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Scan failed')
      }

      const result = await response.json()
      setScanResult(result)

      const id = await saveSession(result)
      setSessionId(id)
      setSessionCount(prev => prev + 1)

    } catch (err) {
      setScanError(err.message || 'Failed to scan project')
    } finally {
      setIsScanning(false)
    }
  }

  // ─── Full Migration Pipeline ───────────────────────────────────────────────
  async function handleStartMigration() {
    if (isRunning || !scanResult) return

    setIsRunning(true)
    setIsComplete(false)
    setStepStatuses({})
    setLogs([])
    setCompletionStats(null)

    if (sessionId) await updateSessionStatus(sessionId, 'running')
    window.scrollTo({ top: 0, behavior: 'smooth' })

    const currentSettings = getSettings()

    // ── Step 1: Scan Results ─────────────────────────────────────────────────
    setStepStatuses(prev => ({ ...prev, scan: 'running' }))
    for (const line of STEP_LOGS.scan) {
      await sleep(150)
      appendLog(line)
    }
    appendLog(`[SCAN] ${scanResult.totalIssues} issues found across ${scanResult.totalJavaFiles} Java files`)
    appendLog(`[SCAN] Build system: ${scanResult.buildSystem} — Spring Boot ${scanResult.springBootVersion}`)
    await sleep(300)
    setStepStatuses(prev => ({ ...prev, scan: 'complete' }))
    await sleep(200)

    // ── Step 2: Claude AI ────────────────────────────────────────────────────
    setStepStatuses(prev => ({ ...prev, claude: 'running' }))
    appendLog('[AI] Connecting to Claude claude-sonnet-4...')
    await sleep(300)

    let migrationPlan = null
    try {
      const response = await fetch('/api/claude/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanResult,
          apiKey: currentSettings.claudeApiKey
        })
      })
      const data = await response.json()

      if (data.success && data.plan) {
        migrationPlan = data.plan
        const totalChanges = migrationPlan.files.reduce((s, f) => s + f.changes.length, 0)
        appendLog(`[AI] Migration plan generated — ${migrationPlan.files.length} files, ${totalChanges} changes`)
        appendLog(`[AI] ${migrationPlan.summary}`)
        setStepStatuses(prev => ({ ...prev, claude: 'complete' }))
      } else {
        appendLog(`[AI] Error: ${data.error}`)
        setStepStatuses(prev => ({ ...prev, claude: 'failed' }))
        setIsRunning(false)
        return
      }
    } catch (e) {
      appendLog(`[AI] Failed: ${e.message}`)
      setStepStatuses(prev => ({ ...prev, claude: 'failed' }))
      setIsRunning(false)
      return
    }
    await sleep(300)

    // ── Step 3: Apply Changes ────────────────────────────────────────────────
    setStepStatuses(prev => ({ ...prev, apply: 'running' }))
    appendLog('[APPLY] Creating backup of original files...')
    await sleep(400)

    let applyData = null
    try {
      const response = await fetch('/api/apply-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: scanResult.projectPath,
          files: migrationPlan.files
        })
      })
      applyData = await response.json()

      if (applyData.success) {
        for (const result of applyData.results) {
          await sleep(100)
          if (result.status === 'success') {
            appendLog(`[APPLY] ${result.file} — ${result.changesApplied} changes applied ✓`)
          } else if (result.status === 'skipped') {
            appendLog(`[APPLY] ${result.file} — skipped (${result.reason})`)
          } else {
            appendLog(`[APPLY] ${result.file} — error: ${result.reason}`)
          }
        }
        appendLog(`[APPLY] ${applyData.successCount}/${applyData.totalFiles} files updated ✓`)
        appendLog(`[APPLY] Backup saved to .upgrader-backup/`)
        setStepStatuses(prev => ({ ...prev, apply: 'complete' }))
      } else {
        appendLog(`[APPLY] Failed: ${applyData.error}`)
        setStepStatuses(prev => ({ ...prev, apply: 'failed' }))
        setIsRunning(false)
        return
      }
    } catch (e) {
      appendLog(`[APPLY] Failed: ${e.message}`)
      setStepStatuses(prev => ({ ...prev, apply: 'failed' }))
      setIsRunning(false)
      return
    }
    await sleep(300)

    // ── Step 4: Jenkins Build ────────────────────────────────────────────────
    setStepStatuses(prev => ({ ...prev, jenkins: 'running' }))

    const jenkinsConfig = JSON.parse(
      localStorage.getItem('upgrader_jenkins_config') || '{}'
    )
    const useMock = !jenkinsConfig.jenkinsUrl || !jenkinsConfig.jobName
    let buildStatus = 'SUCCESS'

    if (useMock) {
      appendLog('[JENKINS] No Jenkins configured — running mock build simulation...')
      for (const line of STEP_LOGS.jenkins) {
        await sleep(700)
        appendLog(line)
      }
      setStepStatuses(prev => ({ ...prev, jenkins: 'complete' }))
    } else {
      appendLog(`[JENKINS] Connecting to ${jenkinsConfig.jenkinsUrl}...`)
      try {
        const triggerRes = await fetch('/api/jenkins/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jenkinsConfig)
        })
        const triggerData = await triggerRes.json()

        if (triggerData.success) {
          appendLog('[JENKINS] Build triggered successfully')
          let attempts = 0
          let buildDone = false

          while (!buildDone && attempts < 30) {
            await sleep(5000)
            attempts++

            const statusRes = await fetch('/api/jenkins/status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(jenkinsConfig)
            })
            const statusData = await statusRes.json()

            if (statusData.building) {
              appendLog(`[JENKINS] Build #${statusData.buildNumber} running... (${attempts * 5}s)`)
            } else if (statusData.result === 'SUCCESS') {
              appendLog(`[JENKINS] Build #${statusData.buildNumber} — SUCCESS ✓`)
              appendLog('')
              appendLog('========================================')
              appendLog('  MIGRATION COMPLETED SUCCESSFULLY')
              appendLog('========================================')
              buildDone = true
              buildStatus = 'SUCCESS'
              setStepStatuses(prev => ({ ...prev, jenkins: 'complete' }))
            } else if (statusData.result === 'FAILURE') {
              appendLog(`[JENKINS] Build #${statusData.buildNumber} — FAILED ✗`)
              appendLog('[JENKINS] Check build logs for compile errors')
              buildDone = true
              buildStatus = 'FAILED'
              setStepStatuses(prev => ({ ...prev, jenkins: 'failed' }))
            }
          }
        } else {
          appendLog(`[JENKINS] Trigger failed: ${triggerData.message}`)
          setStepStatuses(prev => ({ ...prev, jenkins: 'failed' }))
          buildStatus = 'FAILED'
        }
      } catch (e) {
        appendLog(`[JENKINS] Connection failed: ${e.message}`)
        setStepStatuses(prev => ({ ...prev, jenkins: 'failed' }))
        buildStatus = 'FAILED'
      }
    }

    // ── Completion ───────────────────────────────────────────────────────────
    const totalChanges = migrationPlan.files.reduce((s, f) => s + f.changes.length, 0)
    setCompletionStats({
      filesUpdated: applyData?.successCount || 0,
      changesApplied: totalChanges,
      buildStatus: buildStatus === 'SUCCESS' ? '✓ Pass' : '✗ Fail'
    })

    setIsRunning(false)
    setIsComplete(true)
    if (sessionId) await updateSessionStatus(sessionId, 'complete')
  }

  // ─── Restore Backup ───────────────────────────────────────────────────────
  async function handleRestoreBackup() {
    if (!scanResult) return
    try {
      const response = await fetch('/api/restore-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath: scanResult.projectPath })
      })
      const data = await response.json()
      if (data.success) {
        appendLog(`[RESTORE] ${data.restoredFiles} files restored from backup ✓`)
        setIsComplete(false)
        setStepStatuses({})
        setLogs([])
        setCompletionStats(null)
      }
    } catch (e) {
      appendLog(`[RESTORE] Failed: ${e.message}`)
    }
  }

  // ─── Open Project Folder ──────────────────────────────────────────────────
  function handleOpenProject() {
    if (!scanResult) return
    // Copy path to clipboard
    navigator.clipboard.writeText(scanResult.projectPath)
      .then(() => appendLog(`[INFO] Project path copied to clipboard: ${scanResult.projectPath}`))
      .catch(() => appendLog(`[INFO] Project path: ${scanResult.projectPath}`))
  }

  // ─── Reset ────────────────────────────────────────────────────────────────
  function handleReset() {
    setScanResult(null)
    setScanError('')
    setStepStatuses({})
    setLogs([])
    setIsRunning(false)
    setIsComplete(false)
    setSessionId(null)
    setCompletionStats(null)
    setResetKey(prev => prev + 1)
  }

  // ─── Restore Session ──────────────────────────────────────────────────────
  async function handleRestoreSession(session) {
    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath: session.project_path })
      })
      if (response.ok) {
        const result = await response.json()
        setScanResult(result)
        setSessionId(session.id)
        setScanError('')
        setIsRunning(false)
        setIsComplete(false)
        setStepStatuses({})
        setLogs([])
        setCompletionStats(null)
        setResetKey(prev => prev + 1)
      }
    } catch (e) {
      setScanError('Failed to restore session')
    }
  }

  function handleSessionDeleted() {
    setSessionCount(prev => prev - 1)
  }

  function handleSettingsClose() {
    setIsSettingsOpen(false)
    setSettings(getSettings())
  }

  const migrationStarted = isRunning || isComplete
  const headerStatus = isRunning ? 'Running' : isComplete ? 'Complete' : isScanning ? 'Scanning' : 'Ready'
  const headerColor  = isRunning ? 'bg-amber-400' : isComplete ? 'bg-emerald-400' : isScanning ? 'bg-cyan-400' : 'bg-emerald-400'

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen">

      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 glow-effect">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Application Upgrader</h1>
                <p className="text-xs text-slate-400">AI-Powered Spring Migration Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <HistoryPanel
                onRestoreSession={handleRestoreSession}
                sessionCount={sessionCount}
                onSessionDeleted={handleSessionDeleted}
              />
              {(isComplete || scanResult) && (
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
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 p-1.5 rounded-lg transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </button>
              <span className="text-xs text-slate-500 border border-slate-700 px-2 py-1 rounded">v1.0.0</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Upload — hidden once migration starts */}
        {!migrationStarted && (
          <>
            <UploadPanel
              onProjectScanned={handleProjectScanned}
              isScanning={isScanning}
              resetKey={resetKey}
              autoScan={settings.autoScanOnUpload}
            />
            {scanError && (
              <div className="p-4 bg-rose-500/10 rounded-xl border border-rose-500/30 text-rose-400 text-sm">
                ⚠ {scanError}
              </div>
            )}
          </>
        )}

        {/* Pre-migration: Analysis + Diffs */}
        {/* Post-migration: Execution panel */}
        {!migrationStarted ? (
          <>
            <AnalysisPanel
              scanResult={scanResult}
              onStartMigration={handleStartMigration}
              isRunning={isRunning}
            />
            <DiffViewer scanResult={scanResult} />
          </>
        ) : (
          <ExecutionPanel
            isRunning={isRunning}
            isComplete={isComplete}
            stepStatuses={stepStatuses}
            logs={logs}
            completionStats={completionStats}
            onBack={() => {
              setIsRunning(false)
              setIsComplete(false)
              setStepStatuses({})
              setLogs([])
              setCompletionStats(null)
            }}
            onRestoreBackup={handleRestoreBackup}
            onOpenProject={handleOpenProject}
          />
        )}

      </main>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={handleSettingsClose}
      />

    </div>
  )
}

export default App