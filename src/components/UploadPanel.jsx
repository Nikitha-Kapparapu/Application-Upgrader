import React, { useState, useEffect } from "react";

function UploadPanel({ onProjectScanned, isScanning, resetKey }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFolder, setUploadedFolder] = useState(null);
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setUploadedFolder(null)
    setError('')
    setFinding(false)
  }, [resetKey])

  async function processFiles(files) {
    if (!files || files.length === 0) return;

    const firstFile = files[0];
    const folderName = firstFile.webkitRelativePath
      ? firstFile.webkitRelativePath.split("/")[0]
      : firstFile.name;

    const totalFiles = files.length;
    const totalSize = Array.from(files).reduce((s, f) => s + f.size, 0);

    setUploadedFolder({ folderName, totalFiles, totalSize });
    setError("");
    setFinding(true);

    try {
      // Ask Node.js server to find the real path on disk
      const response = await fetch("/api/find-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderName }),
      });

      const data = await response.json();

      if (data.found) {
        // Auto-scan immediately — no manual input needed
        onProjectScanned(data.projectPath);
      } else {
        setError(
          `Could not locate "${folderName}" on disk. Try moving it to Documents folder.`,
        );
      }
    } catch (e) {
      setError("Failed to locate project on disk.");
    } finally {
      setFinding(false);
    }
  }

  function handleFileSelect(e) {
    processFiles(Array.from(e.target.files));
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  }

  function handleClear() {
    setUploadedFolder(null);
    setError("");
  }

  const sizeDisplay = uploadedFolder
    ? uploadedFolder.totalSize > 1024 * 1024
      ? `${(uploadedFolder.totalSize / 1024 / 1024).toFixed(1)} MB`
      : `${(uploadedFolder.totalSize / 1024).toFixed(0)} KB`
    : "";

  const isLoading = isScanning || finding;

  return (
    <section className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <svg
          className="w-5 h-5 text-cyan-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        <h2 className="text-lg font-semibold">Select Project</h2>
      </div>

      <p className="text-slate-400 text-sm mb-4">
        Upload your Spring Batch or Spring Boot project folder to begin
        analysis.
      </p>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() =>
          !isLoading && document.getElementById("folderInput").click()
        }
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all
          ${isLoading ? "cursor-wait opacity-70" : "cursor-pointer"}
          ${
            isDragging
              ? "border-emerald-500 bg-emerald-500/5"
              : uploadedFolder && !error
                ? "border-emerald-500/50 bg-slate-900/50"
                : error
                  ? "border-rose-500/50 bg-rose-500/5"
                  : "border-slate-600 hover:border-slate-500 bg-slate-900/30"
          }`}
      >
        {isLoading ? (
          <>
            <svg
              className="w-12 h-12 mx-auto mb-3 text-cyan-400 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <p className="text-cyan-400 font-medium mb-1">
              {finding ? "Locating project on disk..." : "Scanning project..."}
            </p>
            <p className="text-slate-500 text-sm">
              {uploadedFolder?.folderName}
            </p>
          </>
        ) : !uploadedFolder ? (
          <>
            <svg
              className="w-12 h-12 mx-auto mb-3 text-slate-500 float-animation"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-slate-300 font-medium mb-1">
              Drop your project folder here
            </p>
            <p className="text-slate-500 text-sm">or click to browse</p>
            <p className="text-slate-600 text-xs mt-2">
              Supports Gradle and Maven projects
            </p>
          </>
        ) : error ? (
          <>
            <svg
              className="w-12 h-12 mx-auto mb-3 text-rose-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-rose-400 font-medium mb-1">Project not found</p>
            <p className="text-slate-400 text-sm">{error}</p>
            <p className="text-slate-600 text-xs mt-2">
              Click to try another folder
            </p>
          </>
        ) : (
          <>
            <svg
              className="w-12 h-12 mx-auto mb-3 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-emerald-400 font-medium mb-1">
              {uploadedFolder.folderName}
            </p>
            <p className="text-slate-400 text-sm">
              {uploadedFolder.totalFiles} files · {sizeDisplay}
            </p>
            <p className="text-slate-600 text-xs mt-1">
              Click to change folder
            </p>
          </>
        )}
      </div>

      <input
        type="file"
        id="folderInput"
        webkitdirectory=""
        multiple
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />

      {/* Clear button */}
      {uploadedFolder && !isLoading && (
        <button
          onClick={handleClear}
          className="mt-3 text-xs text-slate-500 hover:text-rose-400 transition-colors"
        >
          Clear
        </button>
      )}
    </section>
  );
}

export default UploadPanel;
