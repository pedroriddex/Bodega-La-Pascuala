#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CHECK_COMMAND_ENV_DEFAULTS } from '../packages/contracts/src/index.js'
import { applyEnvDefaults, loadWorkspaceEnv } from './lib/env.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function buildCheckEnv() {
  const env = { ...process.env }

  loadWorkspaceEnv(repoRoot, 'sveltekit-app', env)
  loadWorkspaceEnv(repoRoot, 'studio', env)
  applyEnvDefaults(CHECK_COMMAND_ENV_DEFAULTS, env)

  return env
}

function runCommand(label, args, env) {
  console.log(`\n> ${label}`)
  const result = spawnSync('npm', args, {
    cwd: repoRoot,
    env,
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function runRootNode(label, args, env) {
  console.log(`\n> ${label}`)
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    env,
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function runLint(env) {
  runCommand(
    'Sync storefront env types',
    ['run', 'sync', '--workspace=sveltekit-app'],
    env,
  )
  runCommand(
    'Lint storefront',
    ['run', 'lint', '--workspace=sveltekit-app'],
    env,
  )
  runCommand('Lint studio', ['run', 'lint', '--workspace=studio'], env)
}

function runTypecheck(env) {
  runCommand(
    'Sync storefront env types',
    ['run', 'sync', '--workspace=sveltekit-app'],
    env,
  )
  runCommand(
    'Typecheck storefront',
    ['run', 'typecheck', '--workspace=sveltekit-app'],
    env,
  )
  runCommand(
    'Typecheck studio',
    ['run', 'typecheck', '--workspace=studio'],
    env,
  )
}

function runTests(env) {
  runCommand(
    'Run storefront tests',
    ['run', 'test', '--workspace=sveltekit-app'],
    env,
  )
  runRootNode(
    'Run monorepo contract tests',
    ['--import', 'tsx', '--test', 'tests/contracts.test.ts'],
    env,
  )
}

function runBuild(env) {
  runCommand(
    'Build storefront',
    ['run', 'build', '--workspace=sveltekit-app'],
    env,
  )
  runCommand('Build studio', ['run', 'build', '--workspace=studio'], env)
}

const task = process.argv[2]
const env = buildCheckEnv()

switch (task) {
  case 'lint':
    runLint(env)
    break
  case 'typecheck':
    runTypecheck(env)
    break
  case 'test':
    runTests(env)
    break
  case 'build':
    runBuild(env)
    break
  case 'check':
    runLint(env)
    runTypecheck(env)
    runTests(env)
    runBuild(env)
    break
  default:
    console.error(
      'Usage: node scripts/run-monorepo-task.mjs <lint|typecheck|test|build|check>',
    )
    process.exit(1)
}
