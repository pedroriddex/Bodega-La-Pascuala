#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createHash } from 'node:crypto'
import { createClient } from '@sanity/client'

const envPath = path.resolve(process.cwd(), 'sveltekit-app/.env')

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/u)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u)
    if (!match) continue

    const key = match[1]
    let value = match[2] || ''
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function required(name, value) {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value.trim()
}

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

function normalizeOrderItems(orderPublicId, items) {
  const usedKeys = new Set()
  let changed = false

  const normalized = items.map((item, index) => {
    const source = item && typeof item === 'object' ? item : {}
    const keyCandidate = typeof source._key === 'string' ? source._key.trim() : ''
    const hasValidCandidate = keyCandidate.length > 0 && !usedKeys.has(keyCandidate)
    const key = hasValidCandidate
      ? keyCandidate
      : createUniqueItemKey(orderPublicId, source, index, usedKeys)
    usedKeys.add(key)

    const typeCandidate = typeof source._type === 'string' ? source._type.trim() : ''
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

async function run() {
  loadEnv(envPath)

  const projectId = required(
    'PUBLIC_SANITY_PROJECT_ID or SANITY_STUDIO_PROJECT_ID',
    process.env.PUBLIC_SANITY_PROJECT_ID ||
      process.env.SANITY_STUDIO_PROJECT_ID,
  )
  const dataset = required(
    'PUBLIC_SANITY_DATASET or SANITY_STUDIO_DATASET',
    process.env.PUBLIC_SANITY_DATASET || process.env.SANITY_STUDIO_DATASET,
  )
  const token = required(
    'SANITY_API_WRITE_TOKEN',
    process.env.SANITY_API_WRITE_TOKEN,
  )

  const client = createClient({
    projectId,
    dataset,
    token,
    useCdn: false,
    apiVersion: '2024-03-15',
  }).withConfig({
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

    await client.patch(order._id).set({ items: normalized.items }).commit()
    updated += 1
    console.log(`Updated ${order._id}`)
  }

  if (updated === 0) {
    console.log('No orders required item normalization.')
    return
  }

  console.log(`Done. Updated ${updated} order(s).`)
}

run().catch((error) => {
  console.error('Backfill failed:', error)
  process.exitCode = 1
})
