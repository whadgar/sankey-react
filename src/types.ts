export interface Link {
  source: string
  target: string
  value: number
}

export interface ParsedRow {
  name: string
  value: number
}

export interface AppState {
  links: Link[]
  nodeColors: Record<string, string>
  nodeLabels: Record<string, string>
  scopeToSource: boolean
}
