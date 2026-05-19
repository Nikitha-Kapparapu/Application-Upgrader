import React, { useState } from 'react'

// Mock diffs — will be replaced with real Claude output in Phase 5
function generateMockDiffs(scanResult) {
  if (!scanResult) return []

  const diffs = []

  // Group issues by file
  const fileIssues = {}
  scanResult.issues.forEach(issue => {
    if (!fileIssues[issue.file]) fileIssues[issue.file] = []
    fileIssues[issue.file].push(issue)
  })

  Object.entries(fileIssues).forEach(([file, issues]) => {
    const changes = []

    issues.forEach(issue => {
      if (issue.type === 'JAVAX') {
        const oldImport = issue.description.split(': ')[1]
        const newImport = oldImport.replace('javax.', 'jakarta.')
        changes.push({
          type: 'import',
          before: `import ${oldImport};`,
          after:  `import ${newImport};`,
          reason: issue.recommendation
        })
      }
      if (issue.type === 'DEPRECATED_API') {
        if (issue.description.includes('JobBuilderFactory')) {
          changes.push({
            type: 'api',
            before: 'private JobBuilderFactory jobBuilderFactory;',
            after:  '// Use JobBuilder directly — injected via constructor',
            reason: 'JobBuilderFactory removed in Spring Batch 5'
          })
          changes.push({
            type: 'api',
            before: 'return jobBuilderFactory.get("importUserJob")',
            after:  'return new JobBuilder("importUserJob", jobRepository)',
            reason: 'Use JobBuilder with explicit JobRepository'
          })
        }
        if (issue.description.includes('StepBuilderFactory')) {
          changes.push({
            type: 'api',
            before: 'private StepBuilderFactory stepBuilderFactory;',
            after:  '// Use StepBuilder directly — injected via constructor',
            reason: 'StepBuilderFactory removed in Spring Batch 5'
          })
          changes.push({
            type: 'api',
            before: 'return stepBuilderFactory.get("step1")',
            after:  'return new StepBuilder("step1", jobRepository)',
            reason: 'Use StepBuilder with explicit JobRepository'
          })
        }
        if (issue.description.includes('WebSecurityConfigurerAdapter')) {
          changes.push({
            type: 'api',
            before: 'public class SecurityConfig extends WebSecurityConfigurerAdapter {',
            after:  'public class SecurityConfig {',
            reason: 'WebSecurityConfigurerAdapter removed — use SecurityFilterChain bean'
          })
          changes.push({
            type: 'api',
            before: 'protected void configure(HttpSecurity http) throws Exception {',
            after:  'public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {',
            reason: 'Replace configure() with SecurityFilterChain @Bean'
          })
        }
      }
      if (issue.type === 'DOCKERFILE') {
        changes.push({
          type: 'config',
          before: 'FROM eclipse-temurin:17-jdk-alpine',
          after:  'FROM eclipse-temurin:21-jdk-alpine',
          reason: 'Spring Boot 3.x requires Java 21'
        })
      }
      if (issue.type === 'DEPENDENCY') {
        if (file === 'build.gradle') {
          changes.push({
            type: 'config',
            before: "id 'org.springframework.boot' version '2.7.5'",
            after:  "id 'org.springframework.boot' version '3.2.0'",
            reason: 'Upgrade Spring Boot to 3.2.0'
          })
          changes.push({
            type: 'config',
            before: "id 'io.spring.dependency-management' version '1.0.15.RELEASE'",
            after:  "id 'io.spring.dependency-management' version '1.1.4'",
            reason: 'Update dependency management plugin'
          })
        }
        if (file === 'pom.xml') {
          changes.push({
            type: 'config',
            before: '<version>2.7.5</version>',
            after:  '<version>3.2.0</version>',
            reason: 'Upgrade Spring Boot parent to 3.2.0'
          })
          changes.push({
            type: 'config',
            before: '<java.version>17</java.version>',
            after:  '<java.version>21</java.version>',
            reason: 'Spring Boot 3.x requires Java 21'
          })
        }
      }
      if (issue.type === 'JENKINS') {
        changes.push({
          type: 'config',
          before: "jdk 'JDK17'",
          after:  "jdk 'JDK21'",
          reason: 'Update Jenkins JDK tool to 21'
        })
      }
    })

    if (changes.length > 0) {
      diffs.push({ file, changes })
    }
  })

  return diffs
}

function DiffLine({ line, type }) {
  const styles = {
    remove: 'bg-rose-500/10 text-rose-300 border-l-2 border-rose-500',
    add:    'bg-emerald-500/10 text-emerald-300 border-l-2 border-emerald-500',
    info:   'bg-slate-700/30 text-slate-500 border-l-2 border-slate-600',
  }
  const prefixes = { remove: '−', add: '+', info: ' ' }

  return (
    <div className={`px-4 py-0.5 font-mono text-xs flex gap-3 ${styles[type]}`}>
      <span className="select-none w-4 flex-shrink-0 text-center opacity-60">
        {prefixes[type]}
      </span>
      <span className="flex-1 break-all">{line}</span>
    </div>
  )
}

function FileDiff({ file, changes, isExpanded, onToggle }) {
  const fileExt = file.split('.').pop()
  const extColors = {
    java:       'bg-amber-500/20 text-amber-400',
    gradle:     'bg-violet-500/20 text-violet-400',
    xml:        'bg-cyan-500/20 text-cyan-400',
    properties: 'bg-slate-500/20 text-slate-400',
    dockerfile: 'bg-sky-500/20 text-sky-400',
    jenkinsfile:'bg-orange-500/20 text-orange-400',
  }
  const extColor = extColors[fileExt.toLowerCase()] ||
    extColors[file.toLowerCase()] ||
    'bg-slate-500/20 text-slate-400'

  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden">

      {/* File Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 hover:bg-slate-700/50 transition-all"
      >
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
        </svg>
        <span className={`text-xs px-2 py-0.5 rounded font-mono ${extColor}`}>
          {fileExt.toUpperCase()}
        </span>
        <span className="text-sm font-mono text-slate-200 flex-1 text-left">{file}</span>
        <span className="text-xs text-slate-500">{changes.length} change{changes.length !== 1 ? 's' : ''}</span>
      </button>

      {/* Diff Content */}
      {isExpanded && (
        <div className="bg-slate-950">
          {changes.map((change, i) => (
            <div key={i} className="border-t border-slate-800">
              {/* Reason */}
              <div className="px-4 py-1.5 bg-slate-800/50 text-xs text-slate-500 flex items-center gap-2">
                <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {change.reason}
              </div>
              <DiffLine line={change.before} type="remove" />
              <DiffLine line={change.after}  type="add" />
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

function DiffViewer({ scanResult }) {
  const [expandedFiles, setExpandedFiles] = useState({})

  if (!scanResult || scanResult.totalIssues === 0) return null

  const diffs = generateMockDiffs(scanResult)

  if (diffs.length === 0) return null

  function toggleFile(file) {
    setExpandedFiles(prev => ({ ...prev, [file]: !prev[file] }))
  }

  function expandAll() {
    const all = {}
    diffs.forEach(d => { all[d.file] = true })
    setExpandedFiles(all)
  }

  function collapseAll() {
    setExpandedFiles({})
  }

  const totalChanges = diffs.reduce((s, d) => s + d.changes.length, 0)

  return (
    <section className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
          </svg>
          <h2 className="text-lg font-semibold">Migration Diffs</h2>
          <span className="text-xs text-slate-500 ml-1">
            {diffs.length} files · {totalChanges} changes
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1 rounded transition-all"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1 rounded transition-all"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Notice — mock data */}
      <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 mb-5">
        <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p className="text-xs text-amber-400">
          Preview diffs — Claude AI will generate exact file-specific diffs once API key is configured.
        </p>
      </div>

      {/* Diff List */}
      <div className="space-y-3">
        {diffs.map(({ file, changes }) => (
          <FileDiff
            key={file}
            file={file}
            changes={changes}
            isExpanded={!!expandedFiles[file]}
            onToggle={() => toggleFile(file)}
          />
        ))}
      </div>

    </section>
  )
}

export default DiffViewer