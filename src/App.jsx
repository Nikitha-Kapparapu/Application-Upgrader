import React, { useState, useCallback, useEffect } from "react";
import UploadPanel from "./components/UploadPanel.jsx";
import AnalysisPanel from "./components/AnalysisPanel.jsx";
import ExecutionPanel from "./components/ExecutionPanel.jsx";
import DiffViewer from "./components/DiffViewer.jsx";
import HistoryPanel from "./components/HistoryPanel.jsx";
import { STEPS, STEP_LOGS } from "./components/ExecutionPanel.jsx";
import {
  saveSession,
  updateSessionStatus,
  getAllSessions,
} from "./utils/database.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function App() {
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [stepStatuses, setStepStatuses] = useState({});
  const [logs, setLogs] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [resetKey, setResetKey] = useState(0);

  const appendLog = useCallback((line) => {
    setLogs((prev) => [...prev, line]);
  }, []);

  // Load session count on app start
  useEffect(() => {
    getAllSessions().then((s) => setSessionCount(s.length));
  }, []);

  // ─── Real scanner API call ─────────────────────────────────────────────────
  async function handleProjectScanned(projectPath) {
    setIsScanning(true);
    setScanError("");
    setScanResult(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPath }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Scan failed");
      }

      const result = await response.json();
      setScanResult(result);

      // Save session to localStorage
      const id = await saveSession(result);
      setSessionId(id);
      setSessionCount((prev) => prev + 1);
    } catch (err) {
      setScanError(err.message || "Failed to scan project");
    } finally {
      setIsScanning(false);
    }
  }

  // ─── Migration execution ───────────────────────────────────────────────────
  async function handleStartMigration() {
    if (isRunning) return;

    setIsRunning(true);
    setIsComplete(false);
    setStepStatuses({});
    setLogs([]);

    // Update session status
    if (sessionId) await updateSessionStatus(sessionId, "running");

    window.scrollTo({ top: 0, behavior: "smooth" });

    for (const step of STEPS) {
      setStepStatuses((prev) => ({ ...prev, [step.key]: "running" }));

      const stepLogs = STEP_LOGS[step.key] || [];
      for (const line of stepLogs) {
        await sleep(180);
        appendLog(line);
      }

      await sleep(400);
      setStepStatuses((prev) => ({ ...prev, [step.key]: "complete" }));
      await sleep(200);
    }

    setIsRunning(false);
    setIsComplete(true);

    // Update session status
    if (sessionId) await updateSessionStatus(sessionId, "complete");
  }

  // ─── Reset ────────────────────────────────────────────────────────────────
  function handleReset() {
    setScanResult(null);
    setScanError("");
    setStepStatuses({});
    setLogs([]);
    setIsRunning(false);
    setIsComplete(false);
    setSessionId(null);
    setResetKey((prev) => prev + 1);
  }

  // ─── Restore session from history ─────────────────────────────────────────
  async function handleRestoreSession(session) {
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPath: session.project_path }),
      });
      if (response.ok) {
        const result = await response.json();
        setScanResult(result);
        setSessionId(session.id);
        setScanError("");
        setIsRunning(false);
        setIsComplete(false);
        setStepStatuses({});
        setLogs([]);
        setResetKey((prev) => prev + 1);
      }
    } catch (e) {
      setScanError("Failed to restore session");
    }
  }

  function handleSessionDeleted() {
    setSessionCount((prev) => prev - 1);
  }

  const migrationStarted = isRunning || isComplete;
  const headerStatus = isRunning
    ? "Running"
    : isComplete
      ? "Complete"
      : isScanning
        ? "Scanning"
        : "Ready";
  const headerColor = isRunning
    ? "bg-amber-400"
    : isComplete
      ? "bg-emerald-400"
      : isScanning
        ? "bg-cyan-400"
        : "bg-emerald-400";

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 glow-effect">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  Application Upgrader
                </h1>
                <p className="text-xs text-slate-400">
                  AI-Powered Spring Migration Assistant
                </p>
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
                <div
                  className={`w-2 h-2 rounded-full ${headerColor} animate-pulse`}
                ></div>
                <span className="text-xs text-slate-400">{headerStatus}</span>
              </div>
              <span className="text-xs text-slate-500 border border-slate-700 px-2 py-1 rounded">
                v1.0.0
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Upload panel — hidden once migration starts */}
        {!migrationStarted && (
          <>
            <UploadPanel
              onProjectScanned={handleProjectScanned}
              isScanning={isScanning}
              resetKey={resetKey}
            />
            {scanError && (
              <div className="p-4 bg-rose-500/10 rounded-xl border border-rose-500/30 text-rose-400 text-sm">
                ⚠ {scanError}
              </div>
            )}
          </>
        )}

        {/* Analysis + Diff OR Execution */}
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
            onBack={() => {
              setIsRunning(false);
              setIsComplete(false);
              setStepStatuses({});
              setLogs([]);
            }}
          />
        )}
      </main>
    </div>
  );
}

export default App;
