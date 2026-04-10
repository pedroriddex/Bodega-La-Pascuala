import type {StructureResolver} from 'sanity/structure'

export const singletonTypes = new Set(['storeSettings'])

export const deskStructure: StructureResolver = (S) =>
  S.list()
    .title('Contenido')
    .items([
      S.listItem()
        .title('Estado de Tienda')
        .id('storeSettings')
        .schemaType('storeSettings')
        .child(
          S.document()
            .schemaType('storeSettings')
            .documentId('storeSettings')
            .title('Estado de Tienda'),
        ),
      S.divider(),
      ...S.documentTypeListItems().filter((listItem) => {
        const id = listItem.getId()
        return id ? !singletonTypes.has(id) : true
      }),
    ])
