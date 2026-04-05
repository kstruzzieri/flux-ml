import { act } from '@testing-library/react'
import { useAnnotationStore, __resetAnnotationStore } from '@stores/annotationStore'
import { __resetMockState, CreateAnnotation } from '../../__mocks__/wailsjs/go/main/App'
import { EventsEmit } from '../../__mocks__/wailsjs/runtime/runtime'

beforeEach(() => {
  __resetMockState()
  __resetAnnotationStore()
})

describe('useAnnotationStore', () => {
  it('fetchAnnotations populates state for an experiment', async () => {
    await CreateAnnotation('exp-1', 100, 'checkpoint', 'Ckpt 100', '')
    await CreateAnnotation('exp-1', 200, 'alert', 'Drift detected', '')

    await act(async () => {
      await useAnnotationStore.getState().fetchAnnotations('exp-1')
    })

    const annotations = useAnnotationStore.getState().annotations['exp-1']
    expect(annotations).toBeDefined()
    expect(annotations).toHaveLength(2)
    expect(annotations[0].step).toBe(100)
    expect(annotations[0].type).toBe('checkpoint')
    expect(annotations[1].step).toBe(200)
    expect(annotations[1].type).toBe('alert')
  })

  it('returns undefined for experiment with no annotations', () => {
    const annotations = useAnnotationStore.getState().annotations['exp-none']
    expect(annotations).toBeUndefined()
  })

  it('fetchAnnotations returns empty array after fetch when no data', async () => {
    await act(async () => {
      await useAnnotationStore.getState().fetchAnnotations('exp-empty')
    })

    const annotations = useAnnotationStore.getState().annotations['exp-empty']
    expect(annotations).toEqual([])
  })

  it('createAnnotation calls the API', async () => {
    await act(async () => {
      await useAnnotationStore.getState().createAnnotation('exp-1', 100, 'note', 'My note')
    })

    // Verify the annotation was created in the mock
    await act(async () => {
      await useAnnotationStore.getState().fetchAnnotations('exp-1')
    })

    const annotations = useAnnotationStore.getState().annotations['exp-1']
    expect(annotations).toHaveLength(1)
    expect(annotations[0].type).toBe('note')
    expect(annotations[0].label).toBe('My note')
  })

  it('deleteAnnotation removes annotation from backend', async () => {
    const ann = await CreateAnnotation('exp-1', 100, 'note', 'Delete me', '')

    await act(async () => {
      await useAnnotationStore.getState().deleteAnnotation('exp-1', ann.id)
    })

    await act(async () => {
      await useAnnotationStore.getState().fetchAnnotations('exp-1')
    })

    const annotations = useAnnotationStore.getState().annotations['exp-1']
    expect(annotations).toEqual([])
  })
})

describe('live updates', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('annotation:created event triggers re-fetch', async () => {
    await CreateAnnotation('exp-1', 100, 'checkpoint', 'Initial', '')

    useAnnotationStore.getState().initialize()

    // Fetch initial data
    await act(async () => {
      await useAnnotationStore.getState().fetchAnnotations('exp-1')
    })
    expect(useAnnotationStore.getState().annotations['exp-1']).toHaveLength(1)

    // Add another annotation
    await CreateAnnotation('exp-1', 200, 'alert', 'Drift', '')

    // Simulate the event
    EventsEmit('annotation:created', { experimentId: 'exp-1' })

    // Advance past the 200ms debounce
    await act(async () => {
      jest.advanceTimersByTime(300)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(useAnnotationStore.getState().annotations['exp-1']).toHaveLength(2)
  })

  it('annotation:deleted event triggers re-fetch', async () => {
    const ann = await CreateAnnotation('exp-1', 100, 'note', 'Will delete', '')

    useAnnotationStore.getState().initialize()

    await act(async () => {
      await useAnnotationStore.getState().fetchAnnotations('exp-1')
    })
    expect(useAnnotationStore.getState().annotations['exp-1']).toHaveLength(1)

    // Delete directly from mock
    await useAnnotationStore.getState().deleteAnnotation('exp-1', ann.id)

    // Simulate the event
    EventsEmit('annotation:deleted', { experimentId: 'exp-1' })

    await act(async () => {
      jest.advanceTimersByTime(300)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(useAnnotationStore.getState().annotations['exp-1']).toHaveLength(0)
  })
})
