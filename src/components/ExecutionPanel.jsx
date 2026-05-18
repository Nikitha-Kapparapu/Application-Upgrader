import React, { useEffect, useRef } from 'react'

const STEPS = [
  { id: 1, key: 'scan',    title: 'Scanning Project',          description: 'Reading build.gradle and project structure' },
  { id: 2, key: 'detect',  title: 'Detecting Deprecated APIs', description: 'Scanning Java files for javax.* and deprecated Spring APIs' },
  { id: 3, key: 'plan',    title: 'Generating Migration Plan', description: 'Claude AI analyzing and creating file-by-file diffs' },
  { id: 4, key: 'apply',   title: 'Applying Changes',          description: 'Patching source files, build.gradle, Dockerfile, Jenkinsfile' },
  { id: 5, key: 'jenkins', title: 'Verifying Build',           description: 'Triggering Jenkins build and confirming success' },
]

const STEP_LOGS = {
  scan: [
    '$ Initializing Application Upgrader...',
    '[SCAN] Reading build.gradle.kts...',
    '[SCAN] Parsing project structure...',
    '[SCAN] Detected Spring Boot 2.7.x',
    '[SCAN] Found 156 Java source files',
    '[SCAN] Building dependency tree...',
    '[SCAN] Detected 23 outdated dependencies',
    '[SCAN] Project scan complete ✓',
  ],
  detect: [
    '[DETECT] Scanning for deprecated APIs...',
    '[DETECT] Found javax.servlet imports → needs jakarta.servlet',
    '[DETECT] Found javax.persistence imports → needs jakarta.persistence',
    '[DETECT] Found JobBuilderFactory (deprecated in Spring Batch 5)',
    '[DETECT] Found StepBuilderFactory (deprecated in Spring Batch 5)',
    '[DETECT] Found WebSecurityConfigurerAdapter (removed in Spring 6)',
    '[DETECT] Total: 47 issues across 34 files',
    '[DETECT] Detection complete ✓',
  ],
  plan: [
    '[AI] Sending scan results to Claude...',
    '[AI] Analyzing deprecated API patterns...',
    '[AI] Generating migration diffs...',
    '[AI] build.gradle.kts → updating Spring Boot version to 3.2.0',
    '[AI] Dockerfile → eclipse-temurin:17 → eclipse-temurin:21',
    '[AI] Jenkinsfile → updating pipeline stages',
    '[AI] 34 Java files → javax.* to jakarta.* namespace',
    '[AI] Migration plan generated ✓',
  ],
  apply: [
    '[APPLY] Applying OpenRewrite recipe: UpgradeSpringBoot_3_2...',
    '[APPLY] Migrating javax.* → jakarta.* namespace...',
    '[APPLY] Updating JobBuilderFactory usages...',
    '[APPLY] Updating StepBuilderFactory usages...',
    '[APPLY] Patching build.gradle.kts...',
    '[APPLY] Updating Dockerfile base image...',
    '[APPLY] Updating Jenkinsfile pipeline...',
    '[APPLY] All changes applied ✓',
  ],
  jenkins: [
    '[JENKINS] Connecting to Jenkins instance...',
    '[JENKINS] Triggering build: enterprise-batch-processor',
    '[JENKINS] Build #247 started...',
    '[JENKINS] Running unit tests...',
    '[JENKINS] Running integration tests...',
    '[JENKINS] Build completed: SUCCESS ✓',
    '',
    '========================================',
    '  MIGRATION COMPLETED SUCCESSFULLY',
    '========================================',
  ],
}

function StepStatus({ status }) {
  if (status === 'complete') {
    return (
      <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    )
  }
  if (status === 'running') {
    return (
      <svg className="w-5 h-5 text-cyan-400 animate-spin flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
    )
  }
  if (status === 'failed') {
    return (
      <svg className="w-5 h-5 text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    )
  }
  return (
    <div className="w-5 h-5 rounded-full border-2 border-slate-600 flex-shrink-0"></div>
  )
}

function ExecutionPanel({ isRunning, isComplete, stepStatuses, logs, onBack }) {
  const terminalRef = useRef(null)

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs])

  if (!isRunning && Object.keys(stepStatuses).length === 0) return null

  return (
    <section className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <h2 className="text-lg font-semibold">Execution</h2>
        </div>

        {/* Back button — hidden while running */}
        {!isRunning && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Back
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Steps */}
        <div className="space-y-3">
          {STEPS.map(step => {
            const status = stepStatuses[step.key] || 'pending'
            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all
                  ${status === 'complete' ? 'bg-emerald-500/10 border-emerald-500/30' :
                    status === 'running'  ? 'bg-cyan-500/10 border-cyan-500/30' :
                    status === 'failed'   ? 'bg-rose-500/10 border-rose-500/30' :
                    'bg-slate-900/50 border-slate-700'}`}
              >
                <StepStatus status={status} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    status === 'complete' ? 'text-emerald-400' :
                    status === 'running'  ? 'text-cyan-400' :
                    status === 'failed'   ? 'text-rose-400' :
                    'text-slate-300'}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{step.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Terminal */}
        <div className="bg-slate-950 rounded-xl border border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 border-b border-slate-700">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500/70"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500/70"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/70"></div>
            </div>
            <span className="text-xs text-slate-500 font-mono">migration log</span>
          </div>
          <div
            ref={terminalRef}
            className="p-4 h-72 overflow-y-auto terminal-scroll font-mono text-xs space-y-0.5"
          >
            {logs.length === 0 ? (
              <p className="text-slate-600">$ Waiting for execution...</p>
            ) : (
              logs.map((log, i) => (
                <p key={i} className={
                  log.startsWith('[SCAN]')    ? 'text-cyan-400' :
                  log.startsWith('[DETECT]')  ? 'text-amber-400' :
                  log.startsWith('[AI]')      ? 'text-violet-400' :
                  log.startsWith('[APPLY]')   ? 'text-emerald-400' :
                  log.startsWith('[JENKINS]') ? 'text-orange-400' :
                  log.startsWith('$')         ? 'text-slate-300' :
                  log.startsWith('=')         ? 'text-emerald-300 font-bold' :
                  log.startsWith('  MIGR')    ? 'text-emerald-300 font-bold' :
                  'text-slate-500'
                }>
                  {log || '\u00A0'}
                </p>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Completion Summary */}
      {isComplete && (
        <div className="mt-6 pt-4 border-t border-slate-700">
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
            <svg className="w-8 h-8 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <p className="font-semibold text-emerald-400">Migration Completed Successfully</p>
              <p className="text-sm text-slate-400 mt-0.5">
                All files have been updated. Check your project directory for the applied changes.
              </p>
            </div>
          </div>
        </div>
      )}

    </section>
  )
}

export { STEPS, STEP_LOGS }
export default ExecutionPanel