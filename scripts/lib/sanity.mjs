import { createClient } from '@sanity/client'
import {
  CHECK_COMMAND_ENV_DEFAULTS,
  DEFAULT_SANITY_API_VERSION,
} from '../../packages/contracts/src/index.js'
import { applyEnvDefaults, loadWorkspaceEnv, requireEnv } from './env.mjs'

export function bootstrapWorkspaceEnv(
  repoRoot,
  workspace,
  env = { ...process.env },
) {
  loadWorkspaceEnv(repoRoot, workspace, env)
  applyEnvDefaults(CHECK_COMMAND_ENV_DEFAULTS, env)
  return env
}

export function resolveSanityConnection(env = process.env) {
  const projectId = requireEnv(
    'PUBLIC_SANITY_PROJECT_ID or SANITY_STUDIO_PROJECT_ID',
    env.PUBLIC_SANITY_PROJECT_ID || env.SANITY_STUDIO_PROJECT_ID,
  )
  const dataset = requireEnv(
    'PUBLIC_SANITY_DATASET or SANITY_STUDIO_DATASET',
    env.PUBLIC_SANITY_DATASET || env.SANITY_STUDIO_DATASET,
  )
  const token = requireEnv('SANITY_API_WRITE_TOKEN', env.SANITY_API_WRITE_TOKEN)

  return {
    projectId,
    dataset,
    token,
    apiVersion: env.PUBLIC_SANITY_API_VERSION || DEFAULT_SANITY_API_VERSION,
  }
}

export function createWriteClient(env = process.env) {
  const { projectId, dataset, token, apiVersion } = resolveSanityConnection(env)

  return createClient({
    projectId,
    dataset,
    token,
    useCdn: false,
    apiVersion,
  })
}
