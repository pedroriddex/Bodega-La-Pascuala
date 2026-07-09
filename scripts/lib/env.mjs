import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Absolute path to the monorepo root, resolved from this file's own location so
 * scripts work regardless of the current working directory.
 */
export function getRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
}

/**
 * Load a workspace's real `.env` and `.env.local` (no placeholder defaults).
 * Intended for operational scripts that talk to production Sanity and therefore
 * must fail loudly if real credentials are missing.
 */
export function loadRealWorkspaceEnv(
  workspace = 'sveltekit-app',
  env = process.env,
) {
  return loadWorkspaceEnv(getRepoRoot(), workspace, env)
}

export function loadEnvFile(filePath, env = process.env, options = {}) {
  const { override = false } = options

  if (!filePath || !fs.existsSync(filePath)) {
    return false
  }

  const content = fs.readFileSync(filePath, 'utf8')
  for (const line of content.split(/\r?\n/u)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u)
    if (!match) {
      continue
    }

    const key = match[1]
    let value = match[2] ?? ''
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (override || env[key] === undefined) {
      env[key] = value
    }
  }

  return true
}

export function loadWorkspaceEnv(repoRoot, workspace, env = process.env) {
  const workspaceRoot = path.resolve(repoRoot, workspace)
  const loadedFiles = []

  for (const relativePath of ['.env', '.env.local']) {
    const filePath = path.join(workspaceRoot, relativePath)
    if (loadEnvFile(filePath, env)) {
      loadedFiles.push(filePath)
    }
  }

  return loadedFiles
}

export function applyEnvDefaults(defaults, env = process.env) {
  for (const [key, value] of Object.entries(defaults)) {
    if (env[key] === undefined || env[key] === '') {
      env[key] = value
    }
  }

  return env
}

export function requireEnv(name, value) {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value.trim()
}
