#!/usr/bin/env node

import fs from 'node:fs'
import { promises as fsp } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { createClient } from '@sanity/client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const defaultEnvFile = path.join(repoRoot, 'sveltekit-app', '.env')
const imagesDir = path.join(repoRoot, 'sveltekit-app', 'static', 'fotos-bocadillos')

function parseArgs() {
	const args = process.argv.slice(2)
	const options = {
		envFile: defaultEnvFile,
		dryRun: false,
		forceUpload: false,
		verbose: false
	}

	for (let i = 0; i < args.length; i += 1) {
		const arg = args[i]
		if (arg === '--dry-run') {
			options.dryRun = true
			continue
		}
		if (arg === '--force-upload') {
			options.forceUpload = true
			continue
		}
		if (arg === '--verbose') {
			options.verbose = true
			continue
		}
		if (arg === '--env-file') {
			const value = args[i + 1]
			if (!value) {
				throw new Error('Missing value for --env-file')
			}
			options.envFile = path.resolve(process.cwd(), value)
			i += 1
			continue
		}
		throw new Error(`Unknown argument: ${arg}`)
	}

	return options
}

function loadEnvFile(filePath) {
	if (!fs.existsSync(filePath)) {
		return
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
		if (process.env[key] === undefined) {
			process.env[key] = value
		}
	}
}

function requiredEnv(name, value) {
	if (!value || value.trim() === '') {
		throw new Error(`Missing required environment variable: ${name}`)
	}
	return value.trim()
}

function normalizeName(value) {
	return value
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/[()]/gu, ' ')
		.replace(/[^a-z0-9]+/gu, ' ')
		.trim()
		.replace(/\s+/gu, ' ')
}

function slugify(value) {
	return normalizeName(value).replace(/\s+/gu, '-')
}

const bocadillos = [
	{
		title: 'Barrilete',
		halfSize: 7.25,
		fullSize: 12,
		description: 'Sobrasada plancha, bacon y patatas fritas.'
	},
	{
		title: 'Bodegón',
		halfSize: 7.25,
		fullSize: 12,
		description: 'Filete de pollo, queso y tomate.'
	},
	{
		title: 'Clásico',
		halfSize: 7.25,
		fullSize: 12,
		description: 'Tortilla de patata, queso y tomate.'
	},
	{
		title: 'Cofrade',
		halfSize: 7.5,
		fullSize: 12,
		description: 'Lomo de cerdo blanco, jamón serrano plancha y tomate.'
	},
	{
		title: 'Estivador',
		halfSize: 7.25,
		fullSize: 12.5,
		description: 'Queso fresco de cabra, anchoas y tomate.'
	},
	{
		title: 'El Bravero',
		halfSize: 8,
		fullSize: 13,
		description:
			'Solomillo de cerdo, patatas panaderas, cebolla pochada, salsa especial "El Bravero".',
		imageKey: 'Bravero'
	},
	{
		title: 'El Bravero 2',
		halfSize: 8,
		fullSize: 13,
		description:
			'Pechuga de pollo, patatas panaderas, cebolla pochada, salsa especial "El Bravero".',
		imageKey: 'Bravero 2'
	},
	{
		title: 'Reconvertido',
		halfSize: 7.5,
		fullSize: 12.5,
		description: 'Queso fresco de cabra, jamón serrano y tomate.'
	},
	{
		title: 'Republicano',
		halfSize: 8,
		fullSize: 13.5,
		description: 'Longaniza, chorizo, morcilla, patatas fritas y ajoaceite.'
	},
	{
		title: 'David',
		halfSize: 7.75,
		fullSize: 13,
		description: 'Sobrasada a la plancha, pechuga de pollo, cebolla frita y miel.'
	},
	{
		title: 'Javi',
		halfSize: 8,
		fullSize: 13,
		description: 'Longanizas, patatas panaderas, bacon y alioli.'
	},
	{
		title: 'Fer',
		halfSize: 7.5,
		fullSize: 12.5,
		description: 'Lomo adobado, serrano plancha y cebolla.'
	},
	{
		title: 'Elena',
		halfSize: 7.5,
		fullSize: 12.5,
		description: 'Tortilla de patata, queso, bacon y ajoaceite.'
	},
	{
		title: 'Tresbolillo',
		halfSize: 7,
		fullSize: 12,
		description: 'Bacon y queso.'
	},
	{
		title: 'Mari',
		halfSize: 7.5,
		fullSize: 12.5,
		description: 'Tortilla de morcilla, bacon y queso.'
	},
	{
		title: 'Merche',
		halfSize: 7.5,
		fullSize: 12.5,
		description: 'Francesa, lomo de cerdo blanco y queso fresco de cabra.'
	},
	{
		title: 'Pascuala',
		halfSize: 7.5,
		fullSize: 13,
		description: 'Lomo de cerdo blanco, tomate, bacon y cebolla.'
	},
	{
		title: 'Patrón',
		halfSize: 6,
		fullSize: 11,
		description: 'Patatas fritas y huevos fritos.'
	},
	{
		title: 'Pepe',
		halfSize: 7.75,
		fullSize: 13.5,
		description: 'Lomo adobado, bacon, queso, patatas fritas y mayonesa.'
	},
	{
		title: 'Sobornista',
		halfSize: 8,
		fullSize: 13.5,
		description: 'Atún, olivas, anchoas, tomate y cebolla tierna.'
	},
	{
		title: 'Sara',
		halfSize: 7.5,
		fullSize: 12.5,
		description: 'Sobrasada a la plancha, lomo adobado y patatas fritas.'
	},
	{
		title: 'Esther',
		halfSize: 8,
		fullSize: 13,
		description: 'Solomillo de cerdo, sobrasada plancha, cebolla frita y miel.'
	},
	{
		title: 'Desi',
		halfSize: 8,
		fullSize: 13.5,
		description: 'Pechuga de pollo, queso de rulo de cabra, cebolla frita y bacon.'
	},
	{
		title: 'Bluetooth',
		halfSize: 7.25,
		fullSize: 12.25,
		description: 'Lomo de cerdo, queso y bacon.'
	},
	{
		title: 'Chivito',
		halfSize: 8.1,
		fullSize: 13.5,
		description: 'Lomo de cerdo, bacon, lechuga, tomate, huevo y mayonesa.',
		imageKey: 'Chivito (lomo  o pollo)'
	},
	{
		title: 'Chivito de pollo',
		halfSize: 8.1,
		fullSize: 13.5,
		description: 'Pechuga de pollo, bacon, lechuga, tomate, huevo y mayonesa.',
		imageKey: 'Chivito (lomo  o pollo)'
	},
	{
		title: 'Calamares',
		halfSize: 8.25,
		fullSize: 13.5,
		description: 'Con salsa a elegir: mayonesa o alioli.'
	},
	{
		title: 'Super',
		halfSize: 8.5,
		fullSize: 14,
		description: 'Carne de caballo, bacon, cebolla y tomate.'
	},
	{
		title: 'Super Burger',
		halfSize: 9,
		fullSize: 13.5,
		description: '4 hamburguesas de caballo de 70gr, cebolla deshidratada crujiente, queso y bacon.'
	},
	{
		title: 'Super de ternera',
		halfSize: 8.5,
		fullSize: 13.5,
		description: 'Filete de ternera, bacon, cebolla y tomate.'
	},
	{
		title: 'Susan',
		halfSize: 9,
		fullSize: 14,
		description: 'Carne de caballo plancha, jamón serrano plancha y cebolla.'
	},
	{
		title: 'Brascada',
		halfSize: 8.25,
		fullSize: 13.5,
		description: 'Ternera a la plancha, jamón a la plancha y cebolla.'
	}
]

async function buildImageIndex() {
	const index = new Map()
	const entries = await fsp.readdir(imagesDir, { withFileTypes: true })
	for (const entry of entries) {
		if (!entry.isFile()) {
			continue
		}
		const ext = path.extname(entry.name).toLowerCase()
		if (!['.webp', '.jpg', '.jpeg', '.png'].includes(ext)) {
			continue
		}
		const baseName = path.basename(entry.name, ext)
		index.set(normalizeName(baseName), {
			fileName: entry.name,
			filePath: path.join(imagesDir, entry.name),
			baseName
		})
	}
	return index
}

async function getImageAssetId(client, imageInfo, cache, forceUpload) {
	if (cache.has(imageInfo.fileName)) {
		return cache.get(imageInfo.fileName)
	}

	if (!forceUpload) {
		const existingAsset = await client.fetch(
			`*[_type == "sanity.imageAsset" && originalFilename == $filename][0]{_id}`,
			{ filename: imageInfo.fileName }
		)

		if (existingAsset?._id) {
			cache.set(imageInfo.fileName, existingAsset._id)
			return existingAsset._id
		}
	}

	const uploadedAsset = await client.assets.upload('image', fs.createReadStream(imageInfo.filePath), {
		filename: imageInfo.fileName
	})
	cache.set(imageInfo.fileName, uploadedAsset._id)
	return uploadedAsset._id
}

async function main() {
	const options = parseArgs()
	loadEnvFile(options.envFile)

	const projectId = requiredEnv(
		'PUBLIC_SANITY_PROJECT_ID or SANITY_STUDIO_PROJECT_ID',
		process.env.PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID
	)
	const dataset = requiredEnv(
		'PUBLIC_SANITY_DATASET or SANITY_STUDIO_DATASET',
		process.env.PUBLIC_SANITY_DATASET || process.env.SANITY_STUDIO_DATASET
	)
	const token = requiredEnv('SANITY_API_WRITE_TOKEN', process.env.SANITY_API_WRITE_TOKEN)

	const client = createClient({
		projectId,
		dataset,
		apiVersion: '2024-03-15',
		token,
		useCdn: false
	})

	const imageIndex = await buildImageIndex()
	const usedImageNames = new Set()
	const missingImages = []

	const existingDocs = await client.fetch(`*[_type == "sandwich"]{_id, title}`)
	const existingByTitle = new Map()
	for (const doc of existingDocs) {
		const key = normalizeName(doc.title || '')
		if (key && !existingByTitle.has(key)) {
			existingByTitle.set(key, doc)
		}
	}

	const assetCache = new Map()
	let created = 0
	let updated = 0

	for (const bocadillo of bocadillos) {
		const desiredImageKey = normalizeName(bocadillo.imageKey || bocadillo.title)
		const imageInfo = imageIndex.get(desiredImageKey)

		if (!imageInfo) {
			missingImages.push(bocadillo.title)
			continue
		}
		usedImageNames.add(imageInfo.fileName)
		if (options.verbose) {
			console.log(`${bocadillo.title} -> ${imageInfo.fileName}`)
		}

		const docPayload = {
			title: bocadillo.title,
			description: bocadillo.description,
			pricing: {
				halfSize: bocadillo.halfSize,
				fullSize: bocadillo.fullSize
			}
		}

		const existing = existingByTitle.get(normalizeName(bocadillo.title))
		const targetId = existing?._id || `sandwich-${slugify(bocadillo.title)}`

		if (!options.dryRun) {
			const assetId = await getImageAssetId(client, imageInfo, assetCache, options.forceUpload)
			const data = {
				...docPayload,
				image: {
					_type: 'image',
					asset: {
						_type: 'reference',
						_ref: assetId
					},
					alt: `Bocadillo ${bocadillo.title}`
				}
			}

			if (existing) {
				await client.patch(targetId).set(data).commit()
			} else {
				await client.createIfNotExists({
					_id: targetId,
					_type: 'sandwich',
					...data
				})
			}
		}

		if (existing) {
			updated += 1
		} else {
			created += 1
		}
	}

	const unmatchedImages = [...imageIndex.values()]
		.map((value) => value.fileName)
		.filter((fileName) => !usedImageNames.has(fileName))
		.sort((a, b) => a.localeCompare(b, 'es'))

	console.log(`Mode: ${options.dryRun ? 'dry-run' : 'apply'}`)
	console.log(`Force upload assets: ${options.forceUpload ? 'yes' : 'no'}`)
	console.log(`Sandwiches catalogued: ${bocadillos.length}`)
	console.log(`Created: ${created}`)
	console.log(`Updated: ${updated}`)
	console.log(`Missing images for catalog entries: ${missingImages.length}`)
	if (missingImages.length > 0) {
		console.log(`- ${missingImages.join(', ')}`)
	}
	console.log(`Unmatched images in folder: ${unmatchedImages.length}`)
	if (unmatchedImages.length > 0) {
		console.log(`- ${unmatchedImages.join(', ')}`)
	}
}

main().catch((error) => {
	console.error('Import failed:', error)
	process.exitCode = 1
})
