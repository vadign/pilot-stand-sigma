export interface OpendataDatasetDefinition {
  id: '124' | '125'
  slug: 'construction-permits' | 'construction-commissioned'
  title: string
  fields: string[]
}

export const opendataDatasets: OpendataDatasetDefinition[] = [
  {
    id: '124',
    slug: 'construction-permits',
    title: 'Разрешения на строительство',
    fields: ['NomRazr', 'DatRazr', 'Zastr', 'NameOb', 'AdrOr', 'KadNom'],
  },
  {
    id: '125',
    slug: 'construction-commissioned',
    title: 'Ввод в эксплуатацию',
    fields: ['NomRazr', 'DatRazr', 'Zastr', 'NameOb', 'Raion', 'AdrOb', 'KadNom'],
  },
]

export const getOpendataPassportUrl = (id: string, baseUrl: string): string => `${baseUrl.replace(/\/$/, '')}/pass.aspx?ID=${id}`
