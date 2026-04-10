import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {presentationTool} from 'sanity/presentation'

import {schemaTypes} from './schemas'
import {deskStructure, singletonTypes} from './deskStructure'
import {orderAlertsPlugin} from './plugins/orderAlertsPlugin'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID!
const dataset = process.env.SANITY_STUDIO_DATASET!
const singletonActions = new Set(['publish', 'discardChanges', 'restore'])

export default defineConfig({
  name: 'sanity-template-sveltekit-clean',
  title: 'Clean SvelteKit + Sanity app',
  projectId,
  dataset,
  plugins: [
    orderAlertsPlugin(),
    structureTool({
      structure: deskStructure,
    }),
    presentationTool({
      previewUrl: {
        origin: process.env.SANITY_STUDIO_PREVIEW_URL || 'http://localhost:5173',
        previewMode: {
          enable: '/preview/enable',
          disable: '/preview/disable',
        },
      },
    }),
    visionTool(),
  ],
  schema: {
    types: schemaTypes,
  },
  document: {
    newDocumentOptions: (prev, {creationContext}) => {
      if (creationContext.type === 'global') {
        return prev.filter((templateItem) => !singletonTypes.has(templateItem.templateId))
      }

      return prev
    },
    actions: (prev, context) => {
      if (!context.schemaType || !singletonTypes.has(context.schemaType)) {
        return prev
      }

      return prev.filter((actionItem) => {
        const action = actionItem.action
        return typeof action === 'string' ? singletonActions.has(action) : false
      })
    },
  },
})
