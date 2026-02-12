// Normaliza labels do Nominatim/OpenStreetMap para o padrão "Cidade / UF".
// Isso evita strings gigantes como "Região Geográfica Imediata...".

const STATE_TO_UF: Record<string, string> = {
  Acre: 'AC',
  Alagoas: 'AL',
  Amapá: 'AP',
  Amazonas: 'AM',
  Bahia: 'BA',
  Ceará: 'CE',
  'Distrito Federal': 'DF',
  'Espírito Santo': 'ES',
  Goiás: 'GO',
  Maranhão: 'MA',
  'Mato Grosso': 'MT',
  'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG',
  Pará: 'PA',
  Paraíba: 'PB',
  Paraná: 'PR',
  Pernambuco: 'PE',
  Piauí: 'PI',
  'Rio de Janeiro': 'RJ',
  'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS',
  Rondônia: 'RO',
  Roraima: 'RR',
  'Santa Catarina': 'SC',
  'São Paulo': 'SP',
  Sergipe: 'SE',
  Tocantins: 'TO',
}

// Para evitar match errado (ex.: "Pará" dentro de "Paraná"), tentamos os nomes maiores primeiro.
const STATE_NAMES_BY_LENGTH_DESC = Object.keys(STATE_TO_UF).sort((a, b) => b.length - a.length)

function findUfInText(text: string): string | null {
  // 1) Se tiver ISO (ex.: BR-GO)
  const iso = text.match(/\bBR-([A-Z]{2})\b/)
  if (iso?.[1]) return iso[1]

  // 2) Procura pelo nome do estado
  for (const stateName of STATE_NAMES_BY_LENGTH_DESC) {
    if (text.includes(stateName)) return STATE_TO_UF[stateName]
  }

  // 3) Se já veio UF solto (ex.: " / GO" ou "- GO")
  const ufLoose = text.match(
    /\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/
  )
  if (ufLoose?.[1]) return ufLoose[1]

  return null
}

/**
 * Compacta qualquer label (inclusive os antigos já salvos no banco) para "Cidade / UF".
 * - Ex.: "Inhumas, Região Geográfica Imediata..., Goiás, ..., Brasil" => "Inhumas / GO"
 */
export function compactPlaceLabel(label: string | null | undefined): string {
  const raw = (label ?? '').trim()
  if (!raw) return ''

  // cidade = primeiro pedaço antes da vírgula (na prática resolve a maioria)
  const city = raw.split(',')[0]?.trim() || raw
  const uf = findUfInText(raw)
  if (uf) return `${city} / ${uf}`

  return city
}

/**
 * Versão segura para uso direto em UI: se vier null/undefined devolve fallback.
 */
export function compactPlaceLabelOr(label: string | null | undefined, fallback = '—'): string {
  const v = compactPlaceLabel(label)
  return v ? v : fallback
}
