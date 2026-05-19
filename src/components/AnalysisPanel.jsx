import React from 'react'

const migrationSteps = [
  { id: 1, icon: 'scan',    title: 'Scan Project',            description: 'Read build files, detect Spring version, map dependencies' },
  { id: 2, icon: 'detect',  title: 'Detect Deprecated APIs',  description: 'Find javax.* imports and deprecated Spring APIs' },
  { id: 3, icon: 'plan',    title: 'Generate Migration Plan', description: 'Claude AI creates file-by-file migration diffs' },
  { id: 4, icon: 'apply',   title: 'Apply Changes',           description: 'Patch source files, build.gradle, Dockerfile, Jenkinsfile' },
  { id: 5, icon: 'jenkins', title: 'Verify Build',            description: 'Trigger Jenkins build and confirm success' },
]

const TYPE_COLORS = {
  DEPENDENCY:     { bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  text: 'text-amber-400',  label: 'Dependency' },
  JAVAX:          { bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30',   text: 'text-cyan-400',   label: 'Namespace' },
  DEPRECATED_API: { bg: 'bg-rose-500/10',   border: 'border-rose-500/30',   text: 'text-rose-400',   label: 'Deprecated API' },
  DOCKERFILE:     { bg: 'bg-sky-500/10',    border: 'border-sky-500/30',    text: 'text-sky-400',    label: 'Dockerfile' },
  JENKINS:        { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', label: 'Jenkins' },
}

function IssueBadge({ type }) {
  const c = TYPE_COLORS[type] || TYPE_COLORS.DEPENDENCY
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${c.bg} ${c.border} ${c.text}`}>
      {c.label}
    </span>
  )
}

function AnalysisPanel({ scanResult, onStartMigration, isRunning }) {
  if (!scanResult) return null

  const javaxCount      = scanResult.issues.filter(i => i.type === 'JAVAX').length
  const deprecatedCount = scanResult.issues.filter(i => i.type === 'DEPRECATED_API').length

  return (
    <div className="space-y-6">

      {/* Scan Results */}
      <section className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-5">
          <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <h2 className="text-lg font-semibold">Scan Results</h2>
          <span className="ml-auto text-xs text-slate-500 font-mono truncate max-w-xs">
            {scanResult.projectPath}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="text-center p-3 bg-slate-900/50 rounded-xl border border-slate-700">
            <p className="text-2xl font-bold text-rose-400">{scanResult.totalIssues}</p>
            <p className="text-xs text-slate-400 mt-1">Total Issues</p>
          </div>
          <div className="text-center p-3 bg-slate-900/50 rounded-xl border border-slate-700">
            <p className="text-2xl font-bold text-cyan-400">{javaxCount}</p>
            <p className="text-xs text-slate-400 mt-1">Namespace Changes</p>
          </div>
          <div className="text-center p-3 bg-slate-900/50 rounded-xl border border-slate-700">
            <p className="text-2xl font-bold text-amber-400">{deprecatedCount}</p>
            <p className="text-xs text-slate-400 mt-1">Deprecated APIs</p>
          </div>
          <div className="text-center p-3 bg-slate-900/50 rounded-xl border border-slate-700">
            <p className="text-2xl font-bold text-emerald-400">{scanResult.totalJavaFiles}</p>
            <p className="text-xs text-slate-400 mt-1">Java Files</p>
          </div>
        </div>

        {/* Detected vs Target */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Detected</p>
            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
              <span className="text-sm text-slate-400">Framework</span>
              <span className="text-sm font-medium text-white">Spring Boot {scanResult.springBootVersion}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
              <span className="text-sm text-slate-400">Build System</span>
              <span className="text-sm font-medium text-white capitalize">{scanResult.buildSystem}</span>
            </div>
            {scanResult.hasSpringBatch && (
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <span className="text-sm text-slate-400">Batch</span>
                <span className="text-sm font-medium text-white">Spring Batch {scanResult.springBatchVersion}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Target</p>
            <div className="flex items-center justify-between p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
              <span className="text-sm text-slate-400">Framework</span>
              <span className="text-sm font-medium text-emerald-400">Spring Boot 3.2.0</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
              <span className="text-sm text-slate-400">Namespace</span>
              <span className="text-sm font-medium text-emerald-400">javax.* → jakarta.*</span>
            </div>
            {scanResult.hasSpringBatch && (
              <div className="flex items-center justify-between p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                <span className="text-sm text-slate-400">Batch</span>
                <span className="text-sm font-medium text-emerald-400">Spring Batch 5.x</span>
              </div>
            )}
          </div>
        </div>

        {/* Issues List */}
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
            Detected Issues
          </p>
          <div className="space-y-2 max-h-56 overflow-y-auto terminal-scroll pr-1">
            {scanResult.issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <IssueBadge type={issue.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-slate-400">{issue.file}</p>
                  <p className="text-sm text-slate-300 mt-0.5">{issue.description}</p>
                  <p className="text-xs text-emerald-400 mt-0.5">→ {issue.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Migration Pipeline */}
      <section className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-5">
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          <h2 className="text-lg font-semibold">Migration Pipeline</h2>
        </div>

        <div className="relative mb-6">
          <div className="absolute left-5 top-5 bottom-5 w-px bg-slate-700"></div>
          <div className="space-y-4">
            {migrationSteps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-4 relative">
                <div className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center flex-shrink-0 z-10 text-slate-400 text-sm font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 pb-2">
                  <p className="font-medium text-sm text-white">{step.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onStartMigration}
          disabled={isRunning}
          className={`w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2
            ${isRunning
              ? 'bg-slate-700 cursor-not-allowed text-slate-400'
              : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 shadow-lg shadow-emerald-500/20'
            }`}
        >
          {isRunning ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Migration Running...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Start Migration
            </>
          )}
        </button>
      </section>

    </div>
  )
}

export default AnalysisPanel