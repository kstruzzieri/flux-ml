import { create } from 'zustand'
import { QueryAnnotations, CreateAnnotation, DeleteAnnotation } from '../../wailsjs/go/main/App'
import { EventsOn } from '../../wailsjs/runtime/runtime'
import type { Annotation, AnnotationType } from '../types/annotation'

interface AnnotationState {
  /** experimentId -> Annotation[] */
  annotations: Record<string, Annotation[]>

  fetchAnnotations: (experimentId: string) => Promise<void>
  createAnnotation: (
    experimentId: string,
    step: number,
    type: AnnotationType,
    label: string,
    data?: string
  ) => Promise<void>
  deleteAnnotation: (experimentId: string, annotationId: number) => Promise<void>
  initialize: () => void
}

let _initialized = false
let _debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {}
let _unsubscribe: (() => void) | null = null

export function __resetAnnotationStore(): void {
  _initialized = false
  Object.values(_debounceTimers).forEach(clearTimeout)
  _debounceTimers = {}
  if (_unsubscribe) {
    _unsubscribe()
    _unsubscribe = null
  }
  useAnnotationStore.setState({ annotations: {} })
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  annotations: {},

  fetchAnnotations: async (experimentId: string) => {
    try {
      const results = await QueryAnnotations(experimentId, '', 0, 0)
      set((state) => ({
        annotations: {
          ...state.annotations,
          [experimentId]: results as Annotation[],
        },
      }))
    } catch (err) {
      console.error(`Failed to fetch annotations for ${experimentId}:`, err)
    }
  },

  createAnnotation: async (
    experimentId: string,
    step: number,
    type: AnnotationType,
    label: string,
    data = ''
  ) => {
    try {
      await CreateAnnotation(experimentId, step, type, label, data)
    } catch (err) {
      console.error(`Failed to create annotation for ${experimentId}:`, err)
    }
  },

  deleteAnnotation: async (experimentId: string, annotationId: number) => {
    try {
      await DeleteAnnotation(experimentId, annotationId)
    } catch (err) {
      console.error(`Failed to delete annotation ${annotationId}:`, err)
    }
  },

  initialize: () => {
    if (_initialized) return
    _initialized = true

    const unsubCreated = EventsOn('annotation:created', (data: { experimentId?: string }) => {
      if (!data?.experimentId) return
      const key = `annotation:${data.experimentId}`

      if (_debounceTimers[key]) clearTimeout(_debounceTimers[key])
      _debounceTimers[key] = setTimeout(() => {
        delete _debounceTimers[key]
        get().fetchAnnotations(data.experimentId!)
      }, 200)
    })

    const unsubDeleted = EventsOn('annotation:deleted', (data: { experimentId?: string }) => {
      if (!data?.experimentId) return
      const key = `annotation:${data.experimentId}`

      if (_debounceTimers[key]) clearTimeout(_debounceTimers[key])
      _debounceTimers[key] = setTimeout(() => {
        delete _debounceTimers[key]
        get().fetchAnnotations(data.experimentId!)
      }, 200)
    })

    _unsubscribe = () => {
      unsubCreated()
      unsubDeleted()
    }
  },
}))
