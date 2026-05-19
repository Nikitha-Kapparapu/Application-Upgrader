// Session storage using localStorage — no WebAssembly needed
const STORAGE_KEY = "upgrader_sessions";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function loadSessions() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function persistSessions(sessions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error("Failed to save sessions:", e);
  }
}

export async function saveSession(scanResult) {
  const sessions = loadSessions();
  const id = generateId();

  const folderName = scanResult.projectPath.split("\\").pop().split("/").pop();

  const session = {
    id,
    project_path: scanResult.projectPath,
    folder_name: folderName,
    build_system: scanResult.buildSystem,
    spring_version: scanResult.springBootVersion,
    total_issues: scanResult.totalIssues,
    total_files: scanResult.totalJavaFiles,
    status: "scanned",
    scan_result: scanResult,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  sessions.unshift(session);

  // Keep only last 50 sessions
  if (sessions.length > 50) sessions.splice(50);

  persistSessions(sessions);
  return id;
}

export async function updateSessionStatus(id, status) {
  const sessions = loadSessions();
  const session = sessions.find((s) => s.id === id);
  if (session) {
    session.status = status;
    session.updated_at = new Date().toISOString();
    persistSessions(sessions);
  }
}

export async function getAllSessions() {
  return loadSessions();
}

export async function getSession(id) {
  const sessions = loadSessions();
  return sessions.find((s) => s.id === id) || null;
}

export async function deleteSession(id) {
  const sessions = loadSessions().filter((s) => s.id !== id);
  persistSessions(sessions);
}

export async function clearAllSessions() {
  localStorage.removeItem(STORAGE_KEY);
}
