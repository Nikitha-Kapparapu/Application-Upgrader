import React from 'react'

const migrationSteps = [
  {
    id: 1,
    icon: "scan",
    title: "Scan Project",
    description: "Read build.gradle, detect Spring version, map all dependencies"
  },
  {
    id: 2,
    icon: "detect",
    title: "Detect Deprecated APIs",
    description: "Find all javax.* imports, deprecated Spring APIs across Java source files"
  },
  {
    id: 3,
    icon: "diff",
    title: "Generate Migration Plan",
    description: "Claude AI analyzes scan results and generates file-by-file migration diffs"
  },
  {
    id: 4,
    icon: "apply",
    title: "Apply Changes",
    description: "Patch source files, update build.gradle, Dockerfile and Jenkinsfile"
  },
  {
    id: 5,
    icon: "jenkins",
    title: "Verify Build",
    description: "Trigger Jenkins build via REST API and confirm migration success"
  },
]

function StepIcon({ type }) {
  const icons = {
    scan: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
    ),
    detect: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
    ),
    diff: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    ),
    apply: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
    ),
    jenkins: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
    ),
  }

  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {icons[type]}
    </svg>
  )
}

function detectProjectInfo(files) {
  const fileNames = files.map(f => f.name.toLowerCase())
  const allNames = fileNames.join(' ')

  let springVersion = 'Spring Boot 2.x'
  let targetVersion = 'Spring Boot 3.2'
  let batchVersion = null
  let targetBatch = null

  if (allNames.includes('spring-batch') ||
      allNames.includes('jobbuilderfactory') ||
      allNames.includes('batch.xml')) {
    batchVersion = 'Spring Batch 4.x'
    targetBatch = 'Spring Batch 5.x'
  }

  const hasGradle = fileNames.some(f => f.includes('gradle'))
  const hasDocker = fileNames.some(f => f.includes('dockerfile'))
  const hasJenkins = fileNames.some(f => f.includes('jenkinsfile'))
  const javaCount = files.filter(f => f.name.endsWith('.java')).length

  return {
    springVersion,
    targetVersion,
    batchVersion,
    targetBatch,
    hasGradle,
    hasDocker,
    hasJenkins,
    javaCount,
    totalFiles: files.length,
  }
}

function AnalysisPanel({ files, onStartMigration, isRunning }) {
  if (files.length === 0) return null

  const info = detectProjectInfo(files)

  return (
    <div className="space-y-6">

      {/* Detected Project Info */}
      <section className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-5">
          <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <h2 className="text-lg font-semibold">Project Analysis</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Detected */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Detected</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <span className="text-sm text-slate-400">Framework</span>
                <span className="text-sm font-medium text-white">{info.springVersion}</span>
              </div>
              {info.batchVersion && (
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                  <span className="text-sm text-slate-400">Batch</span>
                  <span className="text-sm font-medium text-white">{info.batchVersion}</span>
                </div>
              )}
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <span className="text-sm text-slate-400">Java Files</span>
                <span className="text-sm font-medium text-white">{info.javaCount}</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <span className="text-sm text-slate-400">Config Files</span>
                <div className="flex gap-2 ml-auto">
                  {info.hasGradle && (
                    <span className="text-xs px-2 py-0.5 rounded bg-violet-500/20 text-violet-400 border border-violet-500/30">Gradle</span>
                  )}
                  {info.hasDocker && (
                    <span className="text-xs px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">Docker</span>
                  )}
                  {info.hasJenkins && (
                    <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">Jenkins</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Target */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Migration Target</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                <span className="text-sm text-slate-400">Framework</span>
                <span className="text-sm font-medium text-emerald-400">{info.targetVersion}</span>
              </div>
              {info.targetBatch && (
                <div className="flex items-center justify-between p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                  <span className="text-sm text-slate-400">Batch</span>
                  <span className="text-sm font-medium text-emerald-400">{info.targetBatch}</span>
                </div>
              )}
              <div className="flex items-center justify-between p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                <span className="text-sm text-slate-400">Namespace</span>
                <span className="text-sm font-medium text-emerald-400">javax.* → jakarta.*</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                <span className="text-sm text-slate-400">Java Target</span>
                <span className="text-sm font-medium text-emerald-400">JDK 21</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Migration Steps */}
      <section className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-5">
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          <h2 className="text-lg font-semibold">Migration Pipeline</h2>
        </div>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-5 bottom-5 w-px bg-slate-700"></div>

          <div className="space-y-4">
            {migrationSteps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-4 relative">
                <div className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center flex-shrink-0 z-10 text-slate-400">
                  <StepIcon type={step.icon} />
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-white">{step.title}</p>
                    <span className="text-xs text-slate-600">Step {index + 1}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <div className="mt-6 pt-4 border-t border-slate-700">
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
        </div>

      </section>

    </div>
  )
}

export default AnalysisPanel