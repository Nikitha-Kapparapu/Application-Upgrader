import React, { useEffect, useState } from "react";
import {
  getAllSessions,
  deleteSession,
  clearAllSessions,
} from "../utils/database.js";

const STATUS_STYLES = {
  scanned: { bg: "bg-cyan-500/20", text: "text-cyan-400", label: "Scanned" },
  running: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Running" },
  complete: {
    bg: "bg-emerald-500/20",
    text: "text-emerald-400",
    label: "Complete",
  },
  failed: { bg: "bg-rose-500/20", text: "text-rose-400", label: "Failed" },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.scanned;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HistoryPanel({ onRestoreSession, sessionCount, onSessionDeleted }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Reload sessions whenever panel opens OR sessionCount changes
  useEffect(() => {
    if (isOpen) loadSessions();
  }, [isOpen, sessionCount]);

  async function loadSessions() {
    setLoading(true);
    try {
      const data = await getAllSessions();
      setSessions(data);
    } catch (e) {
      console.error("Failed to load sessions:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    onSessionDeleted();
  }

  async function handleClearAll() {
    await clearAllSessions();
    setSessions([]);
    // Reset count to 0 in App
    Array.from({ length: sessionCount }).forEach(() => onSessionDeleted());
  }

  return (
    <>
      {/* Toggle Button — uses sessionCount from App for instant update */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-all"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        History
        {sessionCount > 0 && (
          <span className="bg-slate-700 text-slate-300 text-xs px-1.5 py-0.5 rounded-full">
            {sessionCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-16">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer */}
          <div className="relative w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <div className="flex items-center gap-2">
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h2 className="font-semibold text-white">Migration History</h2>
                <span className="text-xs text-slate-500">
                  {sessions.length} sessions
                </span>
              </div>
              <div className="flex items-center gap-2">
                {sessions.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-96 overflow-y-auto terminal-scroll">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <svg
                    className="w-6 h-6 text-cyan-400 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <svg
                    className="w-10 h-10 mb-3 opacity-30"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm">No sessions yet</p>
                  <p className="text-xs mt-1">Scan a project to get started</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => {
                        onRestoreSession(session);
                        setIsOpen(false);
                      }}
                      className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-xl border border-slate-700 hover:border-slate-500 cursor-pointer transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-white truncate">
                            {session.folder_name}
                          </p>
                          <StatusBadge status={session.status} />
                        </div>
                        <p className="text-xs text-slate-500 font-mono truncate mb-1">
                          {session.project_path}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="capitalize">
                            {session.build_system}
                          </span>
                          <span>·</span>
                          <span>Spring Boot {session.spring_version}</span>
                          <span>·</span>
                          <span className="text-rose-400">
                            {session.total_issues} issues
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          {formatDate(session.created_at)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDelete(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-all flex-shrink-0"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HistoryPanel;
