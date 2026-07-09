#!/usr/bin/env node

import process from 'node:process'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { loadRealWorkspaceEnv } from './lib/env.mjs'
import { createWriteClient } from './lib/sanity.mjs'

function buildItemKey(orderPublicId, item, index) {
  const seed = `${orderPublicId}:${index}:${item?.productId || 'item'}:${item?.type || 'unknown'}`
  return createHash('sha1').update(seed).digest('hex').slice(0, 12)
}

function createUniqueItemKey(orderPublicId, item, index, usedKeys) {
  let attempt = 0
  let key = buildItemKey(orderPublicId, item, index)

  while (usedKeys.has(key)) {
    attempt += 1
    key = createHash('sha1')
      .update(
        `${orderPublicId}:${index}:${attempt}:${item?.productId || 'item'}:${item?.type || 'unknown'}`,
      )
      .digest('hex')
      .slice(0, 12)
  }

  return key
}

export function normalizeOrderItems(orderPublicId, items) {
  const usedKeys = new Set()
  let changed = false

  const normalized = items.map((item, index) => {
    const source = item && typeof item === 'object' ? item : {}
    const keyCandidate =
      typeof source._key === 'string' ? source._key.trim() : ''
    const hasValidCandidate =
      keyCandidate.length > 0 && !usedKeys.has(keyCandidate)
    const key = hasValidCandidate
      ? keyCandidate
      : createUniqueItemKey(orderPublicId, source, index, usedKeys)
    usedKeys.add(key)

    const typeCandidate =
      typeof source._type === 'string' ? source._type.trim() : ''
    const type = typeCandidate.length > 0 ? typeCandidate : 'object'

    if (keyCandidate !== key || typeCandidate !== type) {
      changed = true
    }

    return {
      ...source,
      _key: key,
      _type: type,
    }
  })

  return { changed, items: normalized }
}

export async function run({ dryRun = false } = {}) {
  loadRealWorkspaceEnv('sveltekit-app')

  const client = createWriteClient(process.env).withConfig({
    perspective: 'raw',
  })

  const orders = await client.fetch(
    `*[_type == "order"]{
      _id,
      publicId,
      items
    }`,
  )

  if (!Array.isArray(orders) || orders.length === 0) {
    console.log('No orders found.')
    return
  }

  let updated = 0

  for (const order of orders) {
    const publicId =
      typeof order.publicId === 'string' && order.publicId.trim().length > 0
        ? order.publicId.trim()
        : order._id
    const items = Array.isArray(order.items) ? order.items : []
    const normalized = normalizeOrderItems(publicId, items)

    if (!normalized.changed) {
      continue
    }

    if (!dryRun) {
      await client.patch(order._id).set({ items: normalized.items }).commit()
    }
    updated += 1
    console.log(`${dryRun ? '[dry-run] ' : ''}Updated ${order._id}`)
  }

  if (updated === 0) {
    console.log('No orders required item normalization.')
    return
  }

  console.log(
    dryRun
      ? `Dry-run completed. ${updated} order(s) would be updated. No changes were written.`
      : `Done. Updated ${updated} order(s).`,
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
