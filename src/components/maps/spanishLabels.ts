/**
 * Etiquetas del mapa en español.
 * Las teselas vectoriales (esquema OpenMapTiles) traen el nombre local (`name`), las traducciones (`name:es`, …)
 * y una versión en alfabeto latino (`name:latin`). Se muestra, por este orden: español → alfabeto latino → nombre local.
 * Así Tokio sale «Tokio» y no «東京都», y una calle japonesa sin traducción sale en su forma latina si existe.
 */
export const spanishLabel = (): unknown[] => ['coalesce', ['get', 'name:es'], ['get', 'name:latin'], ['get', 'name']]

interface StyleLayerLike {
  type: string
  layout?: Record<string, unknown>
}

export interface StyleLike {
  layers: StyleLayerLike[]
}

/** true si la expresión de texto de la capa muestra un nombre (y no, p. ej., un número de carretera o de portal). */
function showsName(textField: unknown): boolean {
  return /name/.test(JSON.stringify(textField) ?? '')
}

/** Devuelve una copia del estilo con todas las etiquetas de nombres en español. No modifica el original. */
export function toSpanishLabels<T extends StyleLike>(style: T): T {
  return {
    ...style,
    layers: style.layers.map((layer) => {
      const textField = layer.layout?.['text-field']
      if (layer.type !== 'symbol' || textField === undefined || !showsName(textField)) return layer
      return { ...layer, layout: { ...layer.layout, 'text-field': spanishLabel() } }
    }),
  }
}
