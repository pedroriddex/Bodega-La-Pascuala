import { defineField, defineType } from 'sanity'
import { LemonIcon } from '@sanity/icons'

export default defineType({
  name: 'sandwich',
  title: 'Bocadillo',
  type: 'document',
  icon: LemonIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Nombre del Bocadillo',
      type: 'string',
      validation: (rule) => rule.required().max(100),
    }),
    defineField({
      name: 'description',
      title: 'Descripción',
      type: 'text',
      validation: (rule) => rule.max(500),
    }),
    defineField({
      name: 'image',
      title: 'Imagen',
      type: 'image',
      options: {
        hotspot: true,
      },
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          title: 'Texto alternativo',
          validation: (rule) => rule.required(),
        }),
      ],
    }),
    defineField({
      name: 'pricing',
      title: 'Precios',
      type: 'object',
      fields: [
        defineField({
          name: 'halfSize',
          title: 'Precio Medio Bocadillo',
          type: 'number',
          validation: (rule) => rule.required().positive(),
        }),
        defineField({
          name: 'fullSize',
          title: 'Precio Bocadillo Completo',
          type: 'number',
          validation: (rule) => rule.required().positive(),
        }),
      ],
    }),
    defineField({
      name: 'allergens',
      title: 'Alérgenos',
      type: 'array',
      of: [
        {
          type: 'string',
          options: {
            list: [
              { title: 'Gluten', value: 'gluten' },
              { title: 'Cacahuetes', value: 'cacahuetes' },
              { title: 'Frutos secos', value: 'frutos-secos' },
              { title: 'Leche', value: 'leche' },
              { title: 'Huevo', value: 'huevo' },
              { title: 'Pescado', value: 'pescado' },
              { title: 'Marisco', value: 'marisco' },
              { title: 'Soja', value: 'soja' },
              { title: 'Mostaza', value: 'mostaza' },
              { title: 'Sesamo', value: 'sesamo' },
            ],
          },
        },
      ],
      validation: (rule) => rule.unique(),
    }),
  ],
})
