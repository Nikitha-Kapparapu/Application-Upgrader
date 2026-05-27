import React, { useState, useEffect } from "react";
import { getSettings } from "./SettingsPanel.jsx";

function ManualStepsChecklist({ steps }) {
  const [checked, setChecked] = useState({});

  function toggleStep(i) {
    setChecked((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  const completedCount = Object.values(checked).filter(Boolean).length;
  const allDone = completedCount === steps.length;

  return (
    <div className="mb-5 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-cyan-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <p className="text-sm font-medium text-white">
            Manual Steps Required
          </p>
          <span className="text-xs text-slate-500">
            — complete these after applying diffs
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              allDone
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-slate-700 text-slate-400"
            }`}
          >
            {completedCount}/{steps.length} done
          </span>
          {allDone && (
            <svg
              className="w-4 h-4 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-slate-700">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
          style={{
            width: `${steps.length > 0 ? (completedCount / steps.length) * 100 : 0}%`,
          }}
        />
      </div>

      {/* Steps */}
      <div className="p-4 bg-slate-900/50 space-y-2">
        {steps.map((step, i) => (
          <button
            key={i}
            onClick={() => toggleStep(i)}
            className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
              checked[i]
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
            }`}
          >
            {/* Checkbox */}
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                checked[i]
                  ? "bg-emerald-500 border-emerald-500"
                  : "border-slate-600"
              }`}
            >
              {checked[i] && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>

            {/* Step number + text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs text-slate-500 font-mono">
                  Step {i + 1}
                </span>
              </div>
              <p
                className={`text-sm transition-all ${
                  checked[i] ? "text-slate-500 line-through" : "text-slate-300"
                }`}
              >
                {step}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* All done message */}
      {allDone && (
        <div className="px-4 py-3 bg-emerald-500/10 border-t border-emerald-500/20 flex items-center gap-2">
          <svg
            className="w-4 h-4 text-emerald-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-emerald-400 font-medium">
            All manual steps completed! Your migration is ready to verify.
          </p>
        </div>
      )}
    </div>
  );
}

function DiffLine({ line, type }) {
  const styles = {
    remove: "bg-rose-500/10 text-rose-300 border-l-2 border-rose-500",
    add: "bg-emerald-500/10 text-emerald-300 border-l-2 border-emerald-500",
    info: "bg-slate-700/30 text-slate-500 border-l-2 border-slate-600",
  };
  const prefixes = { remove: "−", add: "+", info: " " };

  return (
    <div className={`px-4 py-0.5 font-mono text-xs flex gap-3 ${styles[type]}`}>
      <span className="select-none w-4 flex-shrink-0 text-center opacity-60">
        {prefixes[type]}
      </span>
      <span className="flex-1 break-all">{line}</span>
    </div>
  );
}

function FileDiff({ file, changes, isExpanded, onToggle }) {
  const fileExt = file.split(".").pop().toLowerCase();
  const extColors = {
    java: "bg-amber-500/20 text-amber-400",
    gradle: "bg-violet-500/20 text-violet-400",
    xml: "bg-cyan-500/20 text-cyan-400",
    properties: "bg-slate-500/20 text-slate-400",
    dockerfile: "bg-sky-500/20 text-sky-400",
    jenkinsfile: "bg-orange-500/20 text-orange-400",
    kts: "bg-violet-500/20 text-violet-400",
  };
  const extColor =
    extColors[fileExt] ||
    extColors[file.toLowerCase()] ||
    "bg-slate-500/20 text-slate-400";

  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 hover:bg-slate-700/50 transition-all"
      >
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        <span className={`text-xs px-2 py-0.5 rounded font-mono ${extColor}`}>
          {fileExt.toUpperCase()}
        </span>
        <span className="text-sm font-mono text-slate-200 flex-1 text-left">
          {file}
        </span>
        <span className="text-xs text-slate-500">
          {changes.length} change{changes.length !== 1 ? "s" : ""}
        </span>
      </button>

      {isExpanded && (
        <div className="bg-slate-950">
          {changes.map((change, i) => (
            <div key={i} className="border-t border-slate-800">
              <div className="px-4 py-1.5 bg-slate-800/50 text-xs text-slate-500 flex items-center gap-2">
                <svg
                  className="w-3 h-3 text-cyan-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {change.reason}
              </div>
              <DiffLine line={change.before} type="remove" />
              <DiffLine line={change.after} type="add" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DiffViewer({ scanResult }) {
  const [expandedFiles, setExpandedFiles] = useState({});
  const [migrationPlan, setMigrationPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  

  useEffect(() => {
    if (scanResult && scanResult.totalIssues > 0) {
      generateMigrationPlan();
    } else {
      setMigrationPlan(null);
      setIsAiGenerated(false);
    }
  }, [scanResult]);

  async function generateMigrationPlan() {
    const settings = getSettings();
    const apiKey = settings.claudeApiKey;

    setIsLoading(true);
    setError("");
    setMigrationPlan(null);
    setIsAiGenerated(false);

    if (!apiKey) {
      // Fall back to mock diffs
      setMigrationPlan(generateMockPlan(scanResult));
      setIsAiGenerated(false);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/claude/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanResult, apiKey }),
      });

      const data = await response.json();

      if (data.success && data.plan) {
        setMigrationPlan(data.plan);
        setIsAiGenerated(true);
      } else {
        setError(data.error || "Claude API call failed");
        setMigrationPlan(generateMockPlan(scanResult));
        setIsAiGenerated(false);
      }
    } catch (e) {
      setError("Failed to connect to Claude API: " + e.message);
      setMigrationPlan(generateMockPlan(scanResult));
      setIsAiGenerated(false);
    } finally {
      setIsLoading(false);
    }
  }

  function generateMockPlan(scanResult) {
    const fileIssues = {};
    scanResult.issues.forEach((issue) => {
      if (!fileIssues[issue.file]) fileIssues[issue.file] = [];
      fileIssues[issue.file].push(issue);
    });

    const files = [];
    Object.entries(fileIssues).forEach(([file, issues]) => {
      const changes = [];
      issues.forEach((issue) => {
        if (issue.type === "JAVAX") {
          const oldImport = issue.description.split(": ")[1];
          if (oldImport) {
            changes.push({
              before: `import ${oldImport};`,
              after: `import ${oldImport.replace("javax.", "jakarta.")};`,
              reason: issue.recommendation,
            });
          }
        }
        if (issue.type === "DEPRECATED_API") {
          if (issue.description.includes("JobBuilderFactory")) {
            changes.push({
              before: "private JobBuilderFactory jobBuilderFactory;",
              after: "// Use JobBuilder directly — inject JobRepository",
              reason: "JobBuilderFactory removed in Spring Batch 5",
            });
          }
          if (issue.description.includes("StepBuilderFactory")) {
            changes.push({
              before: "private StepBuilderFactory stepBuilderFactory;",
              after: "// Use StepBuilder directly — inject JobRepository",
              reason: "StepBuilderFactory removed in Spring Batch 5",
            });
          }
          if (issue.description.includes("WebSecurityConfigurerAdapter")) {
            changes.push({
              before:
                "public class SecurityConfig extends WebSecurityConfigurerAdapter {",
              after: "public class SecurityConfig {",
              reason: "WebSecurityConfigurerAdapter removed in Spring 6",
            });
          }
        }
        if (issue.type === "DOCKERFILE") {
          changes.push({
            before: "FROM eclipse-temurin:17-jdk-alpine",
            after: "FROM eclipse-temurin:21-jdk-alpine",
            reason: "Spring Boot 3.x requires Java 21",
          });
        }
        if (issue.type === "DEPENDENCY") {
          if (file.includes("gradle")) {
            changes.push({
              before: "id 'org.springframework.boot' version '2.7.5'",
              after: "id 'org.springframework.boot' version '3.2.0'",
              reason: "Upgrade Spring Boot to 3.2.0",
            });
          }
          if (file.includes("pom")) {
            changes.push({
              before: "<version>2.7.5</version>",
              after: "<version>3.2.0</version>",
              reason: "Upgrade Spring Boot parent to 3.2.0",
            });
          }
        }
        if (issue.type === "JENKINS") {
          changes.push({
            before: "jdk 'JDK17'",
            after: "jdk 'JDK21'",
            reason: "Update Jenkins JDK tool to 21",
          });
        }
      });
      if (changes.length > 0) files.push({ file, changes });
    });

    return {
      summary: "Migration plan generated from scan results",
      targetVersion: "3.2.0",
      files,
      additionalSteps: [],
    };
  }

  function toggleFile(file) {
    setExpandedFiles((prev) => ({ ...prev, [file]: !prev[file] }));
  }

  function expandAll() {
    if (!migrationPlan) return;
    const all = {};
    migrationPlan.files.forEach((f) => {
      all[f.file] = true;
    });
    setExpandedFiles(all);
  }

  function collapseAll() {
    setExpandedFiles({});
  }

  if (!scanResult || scanResult.totalIssues === 0) return null;

  const totalChanges = migrationPlan
    ? migrationPlan.files.reduce((s, f) => s + f.changes.length, 0)
    : 0;

  return (
    <section className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-violet-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
          <h2 className="text-lg font-semibold">Migration Diffs</h2>
          {migrationPlan && (
            <span className="text-xs text-slate-500 ml-1">
              {migrationPlan.files.length} files · {totalChanges} changes
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {!isLoading && migrationPlan && (
            <>
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
              <button
                onClick={generateMigrationPlan}
                className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-violet-500 px-3 py-1 rounded transition-all"
              >
                Regenerate
              </button>
            </>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-3 p-4 bg-violet-500/10 rounded-xl border border-violet-500/20 mb-5">
          <svg
            className="w-5 h-5 text-violet-400 animate-spin flex-shrink-0"
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
          <div>
            <p className="text-sm font-medium text-violet-400">
              Claude AI is analyzing your project...
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Generating file-specific migration diffs
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-500/10 rounded-lg border border-rose-500/20 mb-4">
          <svg
            className="w-4 h-4 text-rose-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xs text-rose-400">
            {error} — showing pattern-based diffs instead.
          </p>
        </div>
      )}

      {/* AI Badge or Mock notice */}
      {!isLoading && migrationPlan && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg border mb-5 ${
            isAiGenerated
              ? "bg-violet-500/10 border-violet-500/20"
              : "bg-amber-500/10 border-amber-500/20"
          }`}
        >
          <svg
            className={`w-4 h-4 flex-shrink-0 ${isAiGenerated ? "text-violet-400" : "text-amber-400"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p
            className={`text-xs ${isAiGenerated ? "text-violet-400" : "text-amber-400"}`}
          >
            {isAiGenerated
              ? `✨ Claude AI generated these diffs specifically for your project — ${migrationPlan.summary}`
              : "Pattern-based preview diffs — add Claude API key in Settings for AI-generated diffs"}
          </p>
        </div>
      )}

      {/* Summary & Additional Steps */}
      {/* Manual Steps Checklist */}
      {!isLoading &&
        migrationPlan &&
        isAiGenerated &&
        migrationPlan.additionalSteps?.length > 0 && (
          <ManualStepsChecklist steps={migrationPlan.additionalSteps} />
        )}

      {/* Diff List */}
      {!isLoading && migrationPlan && (
        <div className="space-y-3">
          {migrationPlan.files.map(({ file, changes }) => (
            <FileDiff
              key={file}
              file={file}
              changes={changes}
              isExpanded={!!expandedFiles[file]}
              onToggle={() => toggleFile(file)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default DiffViewer;
