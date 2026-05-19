import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { spawn } from 'child_process'
import { existsSync, readdirSync } from 'fs'
import path from 'path'
import os from 'os'

// Search common locations for the project folder
function findProjectPath(folderName) {
  const home = os.homedir()
  const searchRoots = [
    path.join(home, 'Documents'),
    path.join(home, 'Desktop'),
    path.join(home, 'Downloads'),
    path.join(home, 'Projects'),
    path.join(home, 'workspace'),
    path.join(home, 'Documents', 'workspace-spring-tools-for-eclipse-4.32.0.RELEASE'),
    'C:\\workspace',
    'C:\\projects',
    'D:\\workspace',
    'D:\\projects',
  ]

  for (const root of searchRoots) {
    if (!existsSync(root)) continue

    // Direct match
    const direct = path.join(root, folderName)
    if (existsSync(direct)) return direct

    // One level deep search
    try {
      const entries = readdirSync(root, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const nested = path.join(root, entry.name, folderName)
          if (existsSync(nested)) return nested
        }
      }
    } catch (e) {
      // Skip unreadable directories
    }
  }

  return null
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'scanner-api',
      configureServer(server) {

        // Health check
        server.middlewares.use('/api/health', (req, res) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ status: 'ok' }))
        })

        // Find project path from folder name
        server.middlewares.use('/api/find-project', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end('Method not allowed')
            return
          }

          let body = ''
          req.on('data', chunk => { body += chunk.toString() })
          req.on('end', () => {
            try {
              const { folderName } = JSON.parse(body)

              if (!folderName) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'folderName is required' }))
                return
              }

              const foundPath = findProjectPath(folderName)
              res.setHeader('Content-Type', 'application/json')

              if (foundPath) {
                console.log(`[FIND] Found project at: ${foundPath}`)
                res.end(JSON.stringify({ found: true, projectPath: foundPath }))
              } else {
                console.log(`[FIND] Project not found: ${folderName}`)
                res.end(JSON.stringify({ found: false, projectPath: null }))
              }

            } catch (e) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Invalid JSON body' }))
            }
          })
        })

        // Scan project
        server.middlewares.use('/api/scan', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end('Method not allowed')
            return
          }

          let body = ''
          req.on('data', chunk => { body += chunk.toString() })
          req.on('end', () => {
            try {
              const { projectPath } = JSON.parse(body)

              if (!projectPath) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'projectPath is required' }))
                return
              }

              const jarPath = path.join(
                process.cwd(),
                'java-tools/build/libs/java-tools-1.0.0.jar'
              )

              console.log(`[SCAN] Scanning: ${projectPath}`)

              const child = spawn('java', ['-jar', jarPath, projectPath])
              let output = ''
              let errorOutput = ''

              child.stdout.on('data', d => { output += d.toString() })
              child.stderr.on('data', d => { errorOutput += d.toString() })

              child.on('close', code => {
                res.setHeader('Content-Type', 'application/json')
                if (code !== 0) {
                  res.statusCode = 500
                  res.end(JSON.stringify({
                    error: 'Scanner failed',
                    details: errorOutput
                  }))
                  return
                }
                try {
                  const result = JSON.parse(output.trim())
                  console.log(`[SCAN] Found ${result.totalIssues} issues`)
                  res.end(JSON.stringify(result))
                } catch (e) {
                  res.statusCode = 500
                  res.end(JSON.stringify({
                    error: 'Failed to parse output',
                    raw: output
                  }))
                }
              })

            } catch (e) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Invalid JSON body' }))
            }
          })
        })
      }
    }
  ],
  base: './',
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
})