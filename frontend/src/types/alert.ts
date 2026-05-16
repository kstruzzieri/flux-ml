export type DetectionLevel = 'clear' | 'monitoring' | 'elevated' | 'detected'

export interface DetectionStatus {
  type?: string
  pattern: string
  status: DetectionLevel
  confidence: number | null
  score_kind?: string
  step?: number
  data?: string
}

export interface PersistedAlert {
  id: number
  experiment_id: string
  type: string
  pattern: string
  step: number
  confidence: number
  score_kind: string
  status: DetectionLevel
  data: string
  acknowledged: boolean
  created_at: number
  resolved_at?: number
}
