import React, { useState } from 'react'

function UploadPanel({ onFilesUploaded }) {
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)

  function handleFileSelect(event) {
    const files = Array.from(event.target.files)
    setUploadedFiles(files)
    onFilesUploaded(files)
  }

  function handleDragOver(event) {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(true)
  }

  function handleDragLeave(event) {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
  }

  function handleDrop(event) {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
    const files = Array.from(event.dataTransfer.files)
    setUploadedFiles(files)
    onFilesUploaded(files)
  }

  function clearFiles() {
    setUploadedFiles([])
    onFilesUploaded([])
  }

  const totalSize = uploadedFiles.reduce((sum, f) => sum + (f.size || 0), 0)
  const sizeDisplay = totalSize > 1024 * 1024
    ? `${(totalSize / 1024 / 1024).toFixed(1)} MB`
    : `${(totalSize / 1024).toFixed(0)} KB`

  return (
    <section className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">

      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
        </svg>
        <h2 className="text-lg font-semibold">Upload Project</h2>
      </div>

      <p className="text-slate-400 text-sm mb-4">
        Select your Spring Batch or Spring Boot project folder to begin analysis.
      </p>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('fileInput').click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${isDragging
            ? 'border-emerald-500 bg-emerald-500/5'
            : uploadedFiles.length > 0
            ? 'border-emerald-500/50 bg-slate-900/50'
            : 'border-slate-600 hover:border-slate-500 bg-slate-900/30'
          }`}
      >
        {uploadedFiles.length === 0 ? (
          <>
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-500 float-animation" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            <p className="text-slate-300 font-medium mb-1">Drop your project folder here</p>
            <p className="text-slate-500 text-sm">or click to browse</p>
            <p className="text-slate-600 text-xs mt-2">Supports Gradle and Maven projects</p>
          </>
        ) : (
          <>
            <svg className="w-12 h-12 mx-auto mb-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p className="text-emerald-400 font-medium mb-1">Project loaded</p>
            <p className="text-slate-400 text-sm">{uploadedFiles.length} files · {sizeDisplay}</p>
          </>
        )}
      </div>

      <input
        type="file"
        id="fileInput"
        multiple
        webkitdirectory=""
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="mt-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-300">
              {uploadedFiles.length} files detected
            </h3>
            <button
              onClick={clearFiles}
              className="text-xs text-slate-500 hover:text-rose-400 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto terminal-scroll">
            {uploadedFiles.slice(0, 15).map((file, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
                <svg className="w-3 h-3 text-cyan-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 012-2h6a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/>
                </svg>
                <span className="truncate">{file.name}</span>
              </div>
            ))}
            {uploadedFiles.length > 15 && (
              <p className="text-xs text-slate-600 italic pt-1">
                ...and {uploadedFiles.length - 15} more files
              </p>
            )}
          </div>
        </div>
      )}

    </section>
  )
}

export default UploadPanel