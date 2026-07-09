#!/usr/bin/env node

import process from 'node:process'
import { pathToFileURL } from 'node:url'
import Stripe from 'stripe'
import { CHECKOUT_INTENT_DOCUMENT_TYPE } from '../packages/contracts/src/index.js'
import { loadRealWorkspaceEnv, requireEnv } from './lib/env.mjs'
import { createWriteClient } from './lib/sanity.mjs'

const DEFAULT_MAX_AGE_HOURS = 24

// PaymentIntent states that mean money is (or may be) committed. We must never
// delete a checkout intent in one of these states: the order simply hasn't been
// materialized yet (webhook not configured/delayed). Those get flagged instead.
const COMMITTED_PI_STATUSES = new Set([
  'succeeded',
  'processing',
  'requires_capture',
])

function parseArgs(argv) {
  const dryRun = argv.includes('--dry-run')
  const ageArg = argv.find((arg) => arg.startsWith('--max-age-hours='))
  const maxAgeHours = ageArg
    ? Number(ageArg.split('=')[1])
    : DEFAULT_MAX_AGE_HOURS

  if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) {
    throw new Error(`Invalid --max-age-hours value: ${ageArg}`)
  }

  return { dryRun, maxAgeHours }
}

export async function run({
  dryRun = false,
  maxAgeHours = DEFAULT_MAX_AGE_HOURS,
} = {}) {
  loadRealWorkspaceEnv('sveltekit-app')

  const client = createWriteClient(process.env)
  const stripe = new Stripe(
    requireEnv('STRIPE_SECRET_KEY', process.env.STRIPE_SECRET_KEY),
    {
      apiVersion: '2026-01-28.clover',
    },
  )

  const cutoff = new Date(
    Date.now() - maxAgeHours * 60 * 60 * 1000,
  ).toISOString()
  const query = `*[_type == "${CHECKOUT_INTENT_DOCUMENT_TYPE}" && createdAt < $cutoff]{
    _id,
    orderPublicId,
    orderNumber,
    createdAt,
    paymentIntentId
  }`
  const intents = await client.fetch(query, { cutoff })

  if (!Array.isArray(intents) || intents.length === 0) {
    console.log(`No checkout intents older than ${maxAgeHours}h found.`)
    return
  }

  console.log(
    `${dryRun ? '[dry-run] ' : ''}Found ${intents.length} stale checkout intent(s) older than ${maxAgeHours}h.`,
  )

  let deleted = 0
  let flagged = 0

  for (const intent of intents) {
    if (intent.paymentIntentId) {
      let status
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          intent.paymentIntentId,
        )
        status = paymentIntent.status
      } catch (error) {
        console.warn(
          `SKIP ${intent._id}: could not verify PaymentIntent ${intent.paymentIntentId} (${error.message}).`,
        )
        flagged += 1
        continue
      }

      if (COMMITTED_PI_STATUSES.has(status)) {
        console.warn(
          `FLAG ${intent._id} (${intent.orderNumber || 'no-number'}): PaymentIntent is "${status}" but no order was materialized. Needs manual review / webhook replay — NOT deleted.`,
        )
        flagged += 1
        continue
      }
    }

    if (!dryRun) {
      await client.delete(intent._id).catch((error) => {
        console.error(`Failed to delete ${intent._id}:`, error.message)
      })
    }
    deleted += 1
    console.log(
      `${dryRun ? '[dry-run] ' : ''}Deleted ${intent._id} (${intent.orderNumber || 'no-number'}, created ${intent.createdAt || 'unknown'}).`,
    )
  }

  console.log(
    `${dryRun ? 'Dry-run: ' : ''}Removed ${deleted} orphan intent(s), flagged ${flagged} for review.`,
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const { dryRun, maxAgeHours } = parseArgs(process.argv.slice(2))
  run({ dryRun, maxAgeHours }).catch((error) => {
    console.error('Cleanup failed:', error)
    process.exitCode = 1
  })
}
