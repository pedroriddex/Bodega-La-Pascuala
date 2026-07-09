#!/usr/bin/env node

import process from 'node:process'
import { randomBytes } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { loadRealWorkspaceEnv } from './lib/env.mjs'
import { createWriteClient } from './lib/sanity.mjs'

const query = '*[_type == "order" && !defined(publicId)]{_id, orderNumber}'

export function generatePublicId() {
  return `ord_${randomBytes(8).toString('hex')}`
}

export async function run({ dryRun = false } = {}) {
  loadRealWorkspaceEnv('sveltekit-app')

  const client = createWriteClient(process.env)
  const orders = await client.fetch(query)

  if (!Array.isArray(orders) || orders.length === 0) {
    console.log('No orders require backfill.')
    return
  }

  console.log(
    `${dryRun ? '[dry-run] ' : ''}Backfilling publicId for ${orders.length} order(s)...`,
  )

  for (const order of orders) {
    const publicId = generatePublicId()
    if (!dryRun) {
      await client.patch(order._id).set({ publicId }).commit()
    }
    console.log(
      `${dryRun ? '[dry-run] ' : ''}Updated ${order._id} (${order.orderNumber || 'no-order-number'}) -> ${publicId}`,
    )
  }

  console.log(
    dryRun
      ? 'Dry-run completed. No changes were written.'
      : 'Backfill completed.',
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const dryRun = process.argv.includes('--dry-run')
  run({ dryRun }).catch((error) => {
    console.error('Backfill failed:', error)
    process.exitCode = 1
  })
}
