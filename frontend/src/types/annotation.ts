export type AnnotationType = 'checkpoint' | 'config_change' | 'alert' | 'note'

export interface Annotation {
  id: number
  experiment_id: string
  step: number
  type: AnnotationType
  label: string
  data: string
  created_at: number
}

export const ANNOTATION_COLORS: Record<AnnotationType, string> = {
  checkpoint: '#3b82f6',
  config_change: '#f59e0b',
  alert: '#ef4444',
  note: '#a78bfa',
} as const
