import React, { useState, useEffect } from 'react'

function UploadPanel({ onProjectScanned, isScanning, resetKey, autoScan = true }) {
  const [isDragging, setIsDragging]         = useState(false)
  const [uploadedFolder, setUploadedFolder] = useState(null)
  const [finding, setFinding]               = useState(false)
  const [error, setError]                   = useState('')

  useEffect(() => {
    setUploadedFolder(null)
    setError('')
    setFinding(false)
  }, [resetKey])

  async function processFiles(files) {
    if (!files || files.length === 0) return

    const firstFile = files[0]
    const folderName = firstFile.webkitRelativePath
      ? firstFile.webkitRelativePath.split('/')[0]
      : firstFile.name

    const totalFiles = files.length
    const totalSize  = Array.from(files).reduce((s, f) => s + f.size, 0)

    setUploadedFolder({ folderName, totalFiles, totalSize })
    setError('')

    // Respect autoScan setting
    if (!autoScan) return

    await scanFolder(folderName)
  }

  async function scanFolder(folderName) {
    setFinding(true)
    try {
      const response = await fetch('/api/find-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName })
      })
      const data = await response.json()

      if (data.found) {
        onProjectScanned(data.projectPath)
      } else {
        setError(`Could not locate "${folderName}" on disk. Try moving it to Documents folder.`)
      }
    } catch (e) {
      setError('Failed to locate project on disk.')
    } finally {
      setFinding(false)
    }
  }

  function handleFileSelect(e) {
    processFiles(Array.from(e.target.files))
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    processFiles(Array.from(e.dataTransfer.files))
  }

  function handleClear() {
    setUploadedFolder(null)
    setError('')
  }

  function handleManualScan() {
    if (uploadedFolder) {
      scanFolder(uploadedFolder.folderName)
    }
  }

  const sizeDisplay = uploadedFolder
    ? uploadedFolder.totalSize > 1024 * 1024
      ? `${(uploadedFolder.totalSize / 1024 / 1024).toFixed(1)} MB`
      : `${(uploadedFolder.totalSize / 1024).toFixed(0)} KB`
    : ''

  const isLoading = isScanning || finding

  return (
    <section className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">

      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
        </svg>
        <h2 className="text-lg font-semibold">Select Project</h2>
      </div>

      <p className="text-slate-400 text-sm mb-4">
        Upload your Spring Batch or Spring Boot project folder to begin analysis.
      </p>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isLoading && document.getElementById('folderInput').click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all
          ${isLoading ? 'cursor-wait opacity-70' : 'cursor-pointer'}
          ${isDragging
            ? 'border-emerald-500 bg-emerald-500/5'
            : uploadedFolder && !error
            ? 'border-emerald-500/50 bg-slate-900/50'
            : error
            ? 'border-rose-500/50 bg-rose-500/5'
            : 'border-slate-600 hover:border-slate-500 bg-slate-900/30'
          }`}
      >
        {isLoading ? (
          <>
            <svg className="w-12 h-12 mx-auto mb-3 text-cyan-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <p className="text-cyan-400 font-medium mb-1">
              {finding ? 'Locating project on disk...' : 'Scanning project...'}
            </p>
            <p className="text-slate-500 text-sm">{uploadedFolder?.folderName}</p>
          </>
        ) : !uploadedFolder ? (
          <>
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-500 float-animation" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            <p className="text-slate-300 font-medium mb-1">Drop your project folder here</p>
            <p className="text-slate-500 text-sm">or click to browse</p>
            <p className="text-slate-600 text-xs mt-2">Supports Gradle and Maven projects</p>
          </>
        ) : error ? (
          <>
            <svg className="w-12 h-12 mx-auto mb-3 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p className="text-rose-400 font-medium mb-1">Project not found</p>
            <p className="text-slate-400 text-sm">{error}</p>
            <p className="text-slate-600 text-xs mt-2">Click to try another folder</p>
          </>
        ) : (
          <>
            <svg className="w-12 h-12 mx-auto mb-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p className="text-emerald-400 font-medium mb-1">{uploadedFolder.folderName}</p>
            <p className="text-slate-400 text-sm">{uploadedFolder.totalFiles} files · {sizeDisplay}</p>
            <p className="text-slate-600 text-xs mt-1">Click to change folder</p>
          </>
        )}
      </div>

      <input
        type="file"
        id="folderInput"
        webkitdirectory=""
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Bottom actions */}
      {uploadedFolder && !isLoading && (
        <div className="mt-4">
          {!autoScan ? (
            // Manual scan mode — show scan button + clear
            <div className="flex gap-3">
              <button
                onClick={handleManualScan}
                className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                Scan Project
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-500/50 text-sm transition-all"
              >
                Clear
              </button>
            </div>
          ) : (
            // Auto scan mode — just clear button
            <button
              onClick={handleClear}
              className="text-xs text-slate-500 hover:text-rose-400 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-3 text-sm text-rose-400 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {error}
        </p>
      )}

    </section>
  )
}

export default UploadPanel