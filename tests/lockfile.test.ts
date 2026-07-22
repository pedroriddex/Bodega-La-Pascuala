import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const lockfile = JSON.parse(
  readFileSync(path.join(repoRoot, 'package-lock.json'), 'utf8'),
) as { packages?: Record<string, unknown> }

/*
 * Vercel builds on linux/x64 while we develop on macOS. npm can prune
 * platform-specific optional dependencies from the lockfile when it is
 * regenerated on another platform (npm/cli#4828), which breaks the production
 * build with "Cannot find module @rollup/rollup-linux-x64-gnu". This guard
 * fails locally instead of in production.
 */
const REQUIRED_NATIVE_PACKAGES = [
  'node_modules/@rollup/rollup-linux-x64-gnu',
  'node_modules/@rollup/rollup-darwin-arm64',
]

test('lockfile keeps the native binaries every target platform needs', () => {
  for (const packagePath of REQUIRED_NATIVE_PACKAGES) {
    assert.ok(
      lockfile.packages?.[packagePath],
      `${packagePath} is missing from package-lock.json. Restore it with:\n` +
        '  git checkout <last-good-commit> -- package-lock.json\n' +
        '  npm install --package-lock-only --legacy-peer-deps\n' +
        'Do not regenerate the lockfile from scratch on macOS (npm/cli#4828).',
    )
  }
})
