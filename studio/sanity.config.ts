import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {presentationTool} from 'sanity/presentation'
import {structureTool} from 'sanity/structure'
import {DEFAULT_STUDIO_PREVIEW_URL} from '@bodega-la-pascuala/contracts'

import {OrderAlertsLayout} from './components/OrderAlertsLayout'
import {deskStructure, hiddenDocumentTypes, singletonTypes} from './deskStructure'
import {schemaTypes} from './schemas'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID!
const dataset = process.env.SANITY_STUDIO_DATASET!
const singletonActions = new Set(['publish', 'discardChanges', 'restore'])
const hiddenTemplateTypes = new Set([...singletonTypes, ...hiddenDocumentTypes])
// Vision runs arbitrary GROQ against the dataset — keep it to local development
// so a deployed Studio doesn't ship an open query console.
const isDev = process.env.NODE_ENV !== 'production'

export default defineConfig({
  name: 'bodega-la-pascuala-studio',
  title: 'Bodega La Pascuala Studio',
  projectId,
  dataset,
  plugins: [
    structureTool({
      structure: deskStructure,
    }),
    presentationTool({
      previewUrl: {
        origin: process.env.SANITY_STUDIO_PREVIEW_URL || DEFAULT_STUDIO_PREVIEW_URL,
        previewMode: {
          enable: '/preview/enable',
          disable: '/preview/disable',
        },
      },
    }),
    ...(isDev ? [visionTool()] : []),
  ],
  schema: {
    types: schemaTypes,
  },
  document: {
    newDocumentOptions: (prev, {creationContext}) => {
      if (creationContext.type === 'global') {
        return prev.filter((templateItem) => !hiddenTemplateTypes.has(templateItem.templateId))
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
  studio: {
    components: {
      layout: OrderAlertsLayout,
    },
  },
})
