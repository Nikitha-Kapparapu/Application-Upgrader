import React, { useState } from 'react'

const JENKINS_KEY = 'upgrader_jenkins_config'

function loadConfig() {
  try {
    const saved = localStorage.getItem(JENKINS_KEY)
    return saved ? JSON.parse(saved) : {
      jenkinsUrl: '',
      jobName: '',
      username: '',
      token: '',
    }
  } catch (e) {
    return { jenkinsUrl: '', jobName: '', username: '', token: '' }
  }
}

function saveConfig(config) {
  localStorage.setItem(JENKINS_KEY, JSON.stringify(config))
}

function JenkinsPanel({ isVisible, onBuildComplete }) {
  const [config, setConfig]             = useState(loadConfig)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [isTesting, setIsTesting]       = useState(false)
  const [testResult, setTestResult]     = useState(null)
  const [buildStatus, setBuildStatus]   = useState(null)
  const [isTriggering, setIsTriggering] = useState(false)
  const [useMock, setUseMock]           = useState(true)

  function handleChange(field, value) {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    saveConfig(config)
    setIsConfigOpen(false)
    setTestResult(null)
  }

  async function handleTest() {
    setIsTesting(true)
    setTestResult(null)
    try {
      const response = await fetch('/api/jenkins/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      const data = await response.json()
      if (data.success) {
        setTestResult({ success: true, message: 'Connected to Jenkins successfully!' })
      } else {
        setTestResult({ success: false, message: data.message || 'Connection failed' })
      }
    } catch (e) {
      setTestResult({ success: false, message: 'Connection failed: ' + e.message })
    } finally {
      setIsTesting(false)
    }
  }

  async function handleTriggerBuild() {
    setIsTriggering(true)
    setBuildStatus({ status: 'triggering', message: 'Triggering Jenkins build...' })

    if (useMock) {
      await runMockBuild()
      return
    }

    try {
      const response = await fetch('/api/jenkins/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      const data = await response.json()

      if (data.success) {
        setBuildStatus({ status: 'running', message: 'Build triggered! Waiting for result...' })
        pollBuildStatus()
      } else {
        setBuildStatus({ status: 'failed', message: data.message })
        setIsTriggering(false)
      }
    } catch (e) {
      setBuildStatus({ status: 'failed', message: 'Failed to trigger: ' + e.message })
      setIsTriggering(false)
    }
  }

  async function runMockBuild() {
    const steps = [
      { status: 'running',  message: 'Build #247 triggered...' },
      { status: 'running',  message: 'Cloning repository...' },
      { status: 'running',  message: 'Running: ./gradlew clean build...' },
      { status: 'running',  message: 'Compiling Java sources...' },
      { status: 'running',  message: 'Running unit tests...' },
      { status: 'running',  message: 'Running integration tests...' },
      { status: 'running',  message: 'Building Docker image...' },
      { status: 'success',  message: 'Build #247 — SUCCESS ✓' },
    ]

    for (const step of steps) {
      await new Promise(r => setTimeout(r, 1000))
      setBuildStatus(step)
    }

    setIsTriggering(false)
    if (onBuildComplete) onBuildComplete('SUCCESS')
  }

  async function pollBuildStatus() {
    let attempts = 0

    const poll = async () => {
      if (attempts >= 30) {
        setBuildStatus({ status: 'timeout', message: 'Build status check timed out' })
        setIsTriggering(false)
        return
      }
      attempts++

      try {
        const response = await fetch('/api/jenkins/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        })
        const data = await response.json()

        if (data.building) {
          setBuildStatus({ status: 'running', message: `Build #${data.buildNumber} running...` })
          setTimeout(poll, 5000)
        } else if (data.result === 'SUCCESS') {
          setBuildStatus({ status: 'success', message: `Build #${data.buildNumber} — SUCCESS ✓` })
          setIsTriggering(false)
          if (onBuildComplete) onBuildComplete('SUCCESS')
        } else if (data.result === 'FAILURE') {
          setBuildStatus({ status: 'failed', message: `Build #${data.buildNumber} — FAILED ✗` })
          setIsTriggering(false)
          if (onBuildComplete) onBuildComplete('FAILURE')
        } else {
          setTimeout(poll, 5000)
        }
      } catch (e) {
        setBuildStatus({ status: 'failed', message: 'Status check failed' })
        setIsTriggering(false)
      }
    }

    setTimeout(poll, 3000)
  }

  if (!isVisible) return null

  const isConfigured = config.jenkinsUrl && config.jobName

  return (
    <section className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
          </svg>
          <h2 className="text-lg font-semibold">Jenkins Build</h2>
        </div>
        <button
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          Configure
        </button>
      </div>

      {/* Config Form */}
      {isConfigOpen && (
        <div className="mb-5 p-4 bg-slate-900/50 rounded-xl border border-slate-700 space-y-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Jenkins Configuration
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Jenkins URL</label>
              <input
                type="text"
                value={config.jenkinsUrl}
                onChange={e => handleChange('jenkinsUrl', e.target.value)}
                placeholder="http://localhost:8080"
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-sm outline-none focus:border-orange-500 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Job Name</label>
              <input
                type="text"
                value={config.jobName}
                onChange={e => handleChange('jobName', e.target.value)}
                placeholder="enterprise-batch-processor"
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-sm outline-none focus:border-orange-500 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Username</label>
              <input
                type="text"
                value={config.username}
                onChange={e => handleChange('username', e.target.value)}
                placeholder="admin"
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-sm outline-none focus:border-orange-500 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">API Token</label>
              <input
                type="password"
                value={config.token}
                onChange={e => handleChange('token', e.target.value)}
                placeholder="Jenkins API token"
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-sm outline-none focus:border-orange-500 transition-all"
              />
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
            }`}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {testResult.success
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                }
              </svg>
              {testResult.message}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleTest}
              disabled={isTesting || !config.jenkinsUrl}
              className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 hover:border-orange-500 hover:text-orange-400 text-sm transition-all disabled:opacity-50"
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-all"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Mock Toggle */}
      <div className="flex items-center gap-3 mb-5 p-3 bg-slate-900/30 rounded-lg border border-slate-700">
        <button
          onClick={() => setUseMock(!useMock)}
          className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 ${useMock ? 'bg-orange-500' : 'bg-slate-700'}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${useMock ? 'left-5' : 'left-0.5'}`}/>
        </button>
        <div>
          <p className="text-xs font-medium text-slate-300">
            {useMock ? 'Mock Mode' : 'Live Mode'}
          </p>
          <p className="text-xs text-slate-500">
            {useMock
              ? 'Simulated build — no Jenkins required'
              : 'Real Jenkins build via REST API'
            }
          </p>
        </div>
      </div>

      {/* Build Status */}
      {buildStatus && (
        <div className={`mb-5 p-4 rounded-xl border flex items-center gap-3 ${
          buildStatus.status === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : buildStatus.status === 'failed' || buildStatus.status === 'timeout'
            ? 'bg-rose-500/10 border-rose-500/30'
            : 'bg-amber-500/10 border-amber-500/30'
        }`}>
          {buildStatus.status === 'running' || buildStatus.status === 'triggering' ? (
            <svg className="w-5 h-5 text-amber-400 animate-spin flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          ) : buildStatus.status === 'success' ? (
            <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5 text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          )}
          <p className={`text-sm font-medium ${
            buildStatus.status === 'success'  ? 'text-emerald-400' :
            buildStatus.status === 'failed' || buildStatus.status === 'timeout' ? 'text-rose-400' :
            'text-amber-400'
          }`}>
            {buildStatus.message}
          </p>
        </div>
      )}

      {/* Trigger Button */}
      <button
        onClick={handleTriggerBuild}
        disabled={isTriggering || (!useMock && !isConfigured)}
        className={`w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2
          ${isTriggering || (!useMock && !isConfigured)
            ? 'bg-slate-700 cursor-not-allowed text-slate-400'
            : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20'
          }`}
      >
        {isTriggering ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Build Running...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
            </svg>
            Trigger Jenkins Build
          </>
        )}
      </button>

      {!useMock && !isConfigured && (
        <p className="text-xs text-slate-500 text-center mt-2">
          Configure Jenkins settings above to enable live builds
        </p>
      )}

    </section>
  )
}

export default JenkinsPanel