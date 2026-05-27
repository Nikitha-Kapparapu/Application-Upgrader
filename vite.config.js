import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { spawn } from "child_process";
import { existsSync, readdirSync } from "fs";
import path from "path";
import os from "os";

function findProjectPath(folderName) {
  const home = os.homedir();
  const searchRoots = [
    path.join(home, "Documents"),
    path.join(home, "Desktop"),
    path.join(home, "Downloads"),
    path.join(home, "Projects"),
    path.join(home, "workspace"),
    path.join(
      home,
      "Documents",
      "workspace-spring-tools-for-eclipse-4.32.0.RELEASE",
    ),
    "C:\\workspace",
    "C:\\projects",
    "D:\\workspace",
    "D:\\projects",
  ];

  for (const root of searchRoots) {
    if (!existsSync(root)) continue;
    const direct = path.join(root, folderName);
    if (existsSync(direct)) return direct;
    try {
      const entries = readdirSync(root, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const nested = path.join(root, entry.name, folderName);
          if (existsSync(nested)) return nested;
        }
      }
    } catch (e) {}
  }
  return null;
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "scanner-api",
      configureServer(server) {
        function findFilePath(projectPath, fileName) {
          const fs = require("fs");
          const path = require("path");

          function walk(dir) {
            try {
              const entries = fs.readdirSync(dir, { withFileTypes: true });
              for (const entry of entries) {
                if (entry.name === ".upgrader-backup") continue;
                if (entry.name === "node_modules") continue;
                if (entry.name === ".git") continue;
                if (entry.name === "build") continue;
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                  const found = walk(fullPath);
                  if (found) return found;
                } else if (
                  entry.name === fileName ||
                  entry.name.toLowerCase() === fileName.toLowerCase()
                ) {
                  return fullPath;
                }
              }
            } catch (e) {}
            return null;
          }
          return walk(projectPath);
        }

        // Health check
        server.middlewares.use("/api/health", (req, res) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ status: "ok" }));
        });

        // Find project path
        server.middlewares.use("/api/find-project", (req, res) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("Method not allowed");
            return;
          }
          let body = "";
          req.on("data", (chunk) => {
            body += chunk.toString();
          });
          req.on("end", () => {
            try {
              const { folderName } = JSON.parse(body);
              if (!folderName) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "folderName is required" }));
                return;
              }
              const foundPath = findProjectPath(folderName);
              res.setHeader("Content-Type", "application/json");
              if (foundPath) {
                console.log(`[FIND] Found project at: ${foundPath}`);
                res.end(
                  JSON.stringify({ found: true, projectPath: foundPath }),
                );
              } else {
                console.log(`[FIND] Project not found: ${folderName}`);
                res.end(JSON.stringify({ found: false, projectPath: null }));
              }
            } catch (e) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Invalid JSON body" }));
            }
          });
        });

        // Scan project
        server.middlewares.use("/api/scan", (req, res) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("Method not allowed");
            return;
          }
          let body = "";
          req.on("data", (chunk) => {
            body += chunk.toString();
          });
          req.on("end", () => {
            try {
              const { projectPath } = JSON.parse(body);
              if (!projectPath) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "projectPath is required" }));
                return;
              }
              const jarPath = path.join(
                process.cwd(),
                "java-tools/build/libs/java-tools-1.0.0.jar",
              );
              console.log(`[SCAN] Scanning: ${projectPath}`);
              const child = spawn("java", ["-jar", jarPath, projectPath]);
              let output = "";
              let errorOutput = "";
              child.stdout.on("data", (d) => {
                output += d.toString();
              });
              child.stderr.on("data", (d) => {
                errorOutput += d.toString();
              });
              child.on("close", (code) => {
                res.setHeader("Content-Type", "application/json");
                if (code !== 0) {
                  res.statusCode = 500;
                  res.end(
                    JSON.stringify({
                      error: "Scanner failed",
                      details: errorOutput,
                    }),
                  );
                  return;
                }
                try {
                  const result = JSON.parse(output.trim());
                  console.log(`[SCAN] Found ${result.totalIssues} issues`);
                  res.end(JSON.stringify(result));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(
                    JSON.stringify({
                      error: "Failed to parse output",
                      raw: output,
                    }),
                  );
                }
              });
            } catch (e) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Invalid JSON body" }));
            }
          });
        });

        // Claude AI — Generate migration plan
        server.middlewares.use("/api/claude/migrate", (req, res) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("Method not allowed");
            return;
          }
          let body = "";
          req.on("data", (chunk) => {
            body += chunk.toString();
          });
          req.on("end", async () => {
            try {
              const { scanResult, apiKey } = JSON.parse(body);
              if (!apiKey) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    error: "Claude API key not configured. Add it in Settings.",
                  }),
                );
                return;
              }
              if (!scanResult) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "scanResult is required" }));
                return;
              }

              const Anthropic = require("@anthropic-ai/sdk");
              const client = new Anthropic.default({ apiKey });
              console.log(
                `[CLAUDE] Generating migration plan for ${scanResult.totalIssues} issues...`,
              );

              // Read actual file contents from disk
              const fs = require("fs");
              const fileContents = {};

              if (scanResult.projectPath) {
                for (const issue of scanResult.issues) {
                  if (issue.file && !fileContents[issue.file]) {
                    const filePath = findFilePath(
                      scanResult.projectPath,
                      issue.file,
                    );
                    if (filePath) {
                      try {
                        fileContents[issue.file] = fs.readFileSync(
                          filePath,
                          "utf8",
                        );
                      } catch (e) {
                        console.log(`[CLAUDE] Could not read ${issue.file}`);
                      }
                    }
                  }
                }
              }

              const fileContentsText = Object.entries(fileContents)
                .map(([name, content]) => `=== ${name} ===\n${content}`)
                .join("\n\n");

              const prompt = `You are an expert Spring Boot migration engineer.

I need to migrate a Spring Boot project from version 2.x to 3.x.

PROJECT SCAN RESULTS:
- Build System: ${scanResult.buildSystem}
- Current Spring Boot Version: ${scanResult.springBootVersion}
- Spring Batch Version: ${scanResult.springBatchVersion}
- Total Java Files: ${scanResult.totalJavaFiles}
- Total Issues: ${scanResult.totalIssues}

DETECTED ISSUES:
${JSON.stringify(scanResult.issues, null, 2)}

ACTUAL FILE CONTENTS (read from disk):
${fileContentsText}

Generate EXACT migration changes based on the actual file contents above.

IMPORTANT RULES:
1. The "before" value must be an EXACT string copied from the file content shown above
2. The "after" value must be the exact replacement string
3. Handle ALL of the following automatically — do NOT put these in additionalSteps:
   - Spring Boot version: upgrade to 3.2.0 in build.gradle or pom.xml
   - Spring Batch version: upgrade to 5.1.0 in build.gradle or pom.xml
   - Gradle dependency management plugin: upgrade to 1.1.4
   - Java source compatibility: upgrade to 21
   - Dockerfile base image: upgrade to eclipse-temurin:21-jdk-alpine
   - Jenkinsfile JDK tool: upgrade to JDK21
   - Jenkinsfile Gradle tool: upgrade to Gradle9
   - JobBuilderFactory: replace with JobBuilder using actual job names from the file
   - StepBuilderFactory: replace with StepBuilder using actual step names from the file
   - WebSecurityConfigurerAdapter: replace with SecurityFilterChain @Bean
   - Any other deprecated Spring APIs found in the scan
4. Do NOT include javax.* import changes — those are handled separately
5. Use the EXACT variable names, method names, and values from the actual file content
6. For JobBuilder replacement, inject JobRepository as constructor parameter
7. For StepBuilder replacement, inject JobRepository as constructor parameter

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "summary": "Brief summary of what was migrated",
  "targetVersion": "3.2.0",
  "files": [
    {
      "file": "filename",
      "changes": [
        {
          "before": "exact string from actual file",
          "after": "exact replacement",
          "reason": "why"
        }
      ]
    }
  ],
  "additionalSteps": [
    "Only include steps requiring manual developer action such as resolving custom business logic issues or compile errors specific to this project"
  ]
}`;

              const message = await client.messages.create({
                model: "claude-sonnet-4-20250514",
                max_tokens: 4000,
                messages: [{ role: "user", content: prompt }],
              });

              const responseText = message.content[0].text;
              console.log(
                `[CLAUDE] Response received — ${responseText.length} chars`,
              );
              const cleaned = responseText
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();

              try {
                const migrationPlan = JSON.parse(cleaned);
                console.log(
                  `[CLAUDE] Migration plan: ${migrationPlan.files?.length || 0} files`,
                );
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: true, plan: migrationPlan }));
              } catch (parseErr) {
                console.error("[CLAUDE] Failed to parse response as JSON");
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: false,
                    error: "Failed to parse Claude response",
                    raw: responseText,
                  }),
                );
              }
            } catch (e) {
              console.error("[CLAUDE] Error:", e.message);
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: e.message }));
            }
          });
        });

        // Apply migration changes to disk
        server.middlewares.use("/api/apply-changes", (req, res) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("Method not allowed");
            return;
          }
          let body = "";
          req.on("data", (chunk) => {
            body += chunk.toString();
          });
          req.on("end", async () => {
            try {
              const { projectPath, files } = JSON.parse(body);
              const fs = require("fs");
              const path = require("path");

              if (!projectPath || !files) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    error: "projectPath and files are required",
                  }),
                );
                return;
              }

              console.log(`[APPLY] Applying changes to ${projectPath}`);
              const results = [];
              const backupDir = path.join(projectPath, ".upgrader-backup");

              if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
              }

              for (const fileChange of files) {
                try {
                  const filePath = findFilePath(projectPath, fileChange.file);

                  if (!filePath) {
                    results.push({
                      file: fileChange.file,
                      status: "skipped",
                      reason: "File not found in project",
                    });
                    continue;
                  }

                  let content = fs.readFileSync(filePath, "utf8");

                  // Backup original file
                  const backupPath = path.join(backupDir, fileChange.file);
                  fs.writeFileSync(backupPath, content);

                  let changeCount = 0;

                  // ── Apply Claude-generated changes ───────────────────────
                  for (const change of fileChange.changes) {
                    const beforeVariants = [
                      change.before,
                      change.before.trim(),
                      change.before.replace(/'/g, '"'),
                      change.before.replace(/"/g, "'"),
                      change.before.trim().replace(/'/g, '"'),
                      change.before.trim().replace(/"/g, "'"),
                    ];

                    let matched = false;

                    // Exact match
                    for (const variant of beforeVariants) {
                      if (content.includes(variant)) {
                        content = content
                          .split(variant)
                          .join(change.after.trim());
                        changeCount++;
                        matched = true;
                        break;
                      }
                    }

                    // Line-by-line trimmed match
                    if (!matched) {
                      const trimmedBefore = change.before.trim();
                      const lines = content.split("\n");
                      for (let i = 0; i < lines.length; i++) {
                        const trimmedLine = lines[i].trim();
                        if (
                          trimmedLine === trimmedBefore ||
                          trimmedLine === trimmedBefore.replace(/'/g, '"') ||
                          trimmedLine === trimmedBefore.replace(/"/g, "'")
                        ) {
                          const indent = lines[i].match(/^(\s*)/)[1];
                          lines[i] = indent + change.after.trim();
                          changeCount++;
                          matched = true;
                          break;
                        }
                      }
                      if (matched) content = lines.join("\n");
                    }

                    // Partial import match
                    if (!matched && change.before.includes("import ")) {
                      const importName = change.before
                        .replace("import ", "")
                        .replace(";", "")
                        .trim();
                      const lines = content.split("\n");
                      for (let i = 0; i < lines.length; i++) {
                        if (lines[i].includes(importName)) {
                          lines[i] = lines[i].replace(
                            importName,
                            change.after
                              .replace("import ", "")
                              .replace(";", "")
                              .trim(),
                          );
                          changeCount++;
                          matched = true;
                          break;
                        }
                      }
                      if (matched) content = lines.join("\n");
                    }
                  }

                  // ── Guaranteed replacements ──────────────────────────────
                  // javax → jakarta (namespace standard — always the same)
                  const javaxPackages = [
                    ["javax.persistence.", "jakarta.persistence."],
                    ["javax.servlet.", "jakarta.servlet."],
                    ["javax.validation.", "jakarta.validation."],
                    ["javax.annotation.", "jakarta.annotation."],
                    ["javax.transaction.", "jakarta.transaction."],
                  ];
                  for (const [from, to] of javaxPackages) {
                    if (content.includes(from)) {
                      const before = content;
                      content = content.split(from).join(to);
                      if (content !== before) changeCount++;
                    }
                  }

                  fs.writeFileSync(filePath, content, "utf8");
                  console.log(
                    `[APPLY] ${fileChange.file} — ${changeCount} changes applied`,
                  );

                  results.push({
                    file: fileChange.file,
                    status: "success",
                    changesApplied: changeCount,
                    totalChanges: fileChange.changes.length,
                  });
                } catch (fileErr) {
                  results.push({
                    file: fileChange.file,
                    status: "error",
                    reason: fileErr.message,
                  });
                }
              }

              const successCount = results.filter(
                (r) => r.status === "success",
              ).length;
              console.log(
                `[APPLY] Complete — ${successCount}/${files.length} files updated`,
              );

              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  success: true,
                  results,
                  successCount,
                  totalFiles: files.length,
                  backupDir,
                }),
              );
            } catch (e) {
              console.error("[APPLY] Error:", e.message);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: false, error: e.message }));
            }
          });
        });

        // Restore backup
        server.middlewares.use("/api/restore-backup", (req, res) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("Method not allowed");
            return;
          }
          let body = "";
          req.on("data", (chunk) => {
            body += chunk.toString();
          });
          req.on("end", () => {
            try {
              const { projectPath } = JSON.parse(body);
              const fs = require("fs");
              const path = require("path");
              const backupDir = path.join(projectPath, ".upgrader-backup");

              if (!fs.existsSync(backupDir)) {
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({ success: false, error: "No backup found" }),
                );
                return;
              }

              const files = fs.readdirSync(backupDir);
              let restored = 0;

              for (const file of files) {
                try {
                  const backupPath = path.join(backupDir, file);
                  const originalPath = findFilePath(projectPath, file);
                  if (originalPath) {
                    fs.copyFileSync(backupPath, originalPath);
                    restored++;
                  }
                } catch (e) {
                  console.error(
                    `[RESTORE] Failed to restore ${file}:`,
                    e.message,
                  );
                }
              }

              console.log(`[RESTORE] Restored ${restored} files`);
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({ success: true, restoredFiles: restored }),
              );
            } catch (e) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: false, error: e.message }));
            }
          });
        });

        // Jenkins trigger
        server.middlewares.use("/api/jenkins/trigger", (req, res) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("Method not allowed");
            return;
          }
          let body = "";
          req.on("data", (chunk) => {
            body += chunk.toString();
          });
          req.on("end", () => {
            try {
              const { jenkinsUrl, jobName, username, token } = JSON.parse(body);
              if (!jenkinsUrl || !jobName) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    error: "jenkinsUrl and jobName are required",
                  }),
                );
                return;
              }
              const http = require("http");
              const https = require("https");
              const urlObj = new URL(`${jenkinsUrl}/job/${jobName}/build`);
              const protocol = urlObj.protocol === "https:" ? https : http;
              const auth = Buffer.from(`${username}:${token}`).toString(
                "base64",
              );
              const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
                path: urlObj.pathname,
                method: "POST",
                headers: {
                  Authorization: `Basic ${auth}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
              };
              const jenkinsReq = protocol.request(options, (jenkinsRes) => {
                res.setHeader("Content-Type", "application/json");
                if (
                  jenkinsRes.statusCode === 201 ||
                  jenkinsRes.statusCode === 200
                ) {
                  res.end(
                    JSON.stringify({
                      success: true,
                      buildUrl: jenkinsRes.headers.location || "",
                      message: "Build triggered",
                    }),
                  );
                } else {
                  res.end(
                    JSON.stringify({
                      success: false,
                      message: `Jenkins returned ${jenkinsRes.statusCode}`,
                    }),
                  );
                }
              });
              jenkinsReq.on("error", (err) => {
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({ success: false, message: err.message }),
                );
              });
              jenkinsReq.end();
            } catch (e) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Invalid JSON body" }));
            }
          });
        });

        // Jenkins status
        server.middlewares.use("/api/jenkins/status", (req, res) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("Method not allowed");
            return;
          }
          let body = "";
          req.on("data", (chunk) => {
            body += chunk.toString();
          });
          req.on("end", () => {
            try {
              const { jenkinsUrl, jobName, username, token } = JSON.parse(body);
              const http = require("http");
              const https = require("https");
              const urlObj = new URL(
                `${jenkinsUrl}/job/${jobName}/lastBuild/api/json`,
              );
              const protocol = urlObj.protocol === "https:" ? https : http;
              const auth = Buffer.from(`${username}:${token}`).toString(
                "base64",
              );
              const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
                path: urlObj.pathname,
                method: "GET",
                headers: { Authorization: `Basic ${auth}` },
              };
              const jenkinsReq = protocol.request(options, (jenkinsRes) => {
                let data = "";
                jenkinsRes.on("data", (chunk) => {
                  data += chunk;
                });
                jenkinsRes.on("end", () => {
                  try {
                    const build = JSON.parse(data);
                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({
                        success: true,
                        buildNumber: build.number,
                        result: build.result,
                        building: build.building,
                        url: build.url,
                        duration: build.duration,
                      }),
                    );
                  } catch (e) {
                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({
                        success: false,
                        message: "Failed to parse response",
                      }),
                    );
                  }
                });
              });
              jenkinsReq.on("error", (err) => {
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({ success: false, message: err.message }),
                );
              });
              jenkinsReq.end();
            } catch (e) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Invalid JSON body" }));
            }
          });
        });
      },
    },
  ],
  base: "./",
  root: ".",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
