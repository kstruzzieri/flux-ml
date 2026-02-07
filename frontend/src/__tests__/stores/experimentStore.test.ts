import { useExperimentStore, __resetInitialized } from '@stores/experimentStore'
import {
  CreateExperiment,
  __resetMockState,
  __setListExperimentsOverride,
} from '../../__mocks__/wailsjs/go/main/App'
import { EventsEmit } from '../../__mocks__/wailsjs/runtime/runtime'
import { act } from '@testing-library/react'

// Reset store state between tests
beforeEach(() => {
  useExperimentStore.setState({
    experiments: [],
    selectedId: null,
    loading: false,
    error: null,
  })
  __resetInitialized()
  __resetMockState()
})

describe('experimentStore', () => {
  // The store must be able to fetch experiments from the backend.
  describe('fetchExperiments', () => {
    it('populates experiments from backend', async () => {
      // Seed mock with experiments
      await CreateExperiment('exp-1', '{}')
      await CreateExperiment('exp-2', '{}')

      await act(async () => {
        await useExperimentStore.getState().fetchExperiments()
      })

      const state = useExperimentStore.getState()
      expect(state.experiments).toHaveLength(2)
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('sets error on fetch failure', async () => {
      __setListExperimentsOverride(() => Promise.reject(new Error('network error')))

      await act(async () => {
        await useExperimentStore.getState().fetchExperiments()
      })

      const state = useExperimentStore.getState()
      expect(state.error).toBe('network error')
      expect(state.experiments).toHaveLength(0)
    })
  })

  // Selection is the primary interaction — clicking an experiment card.
  describe('selectExperiment', () => {
    it('sets selectedId', () => {
      act(() => {
        useExperimentStore.getState().selectExperiment('abc-123')
      })
      expect(useExperimentStore.getState().selectedId).toBe('abc-123')
    })

    it('clears selectedId with null', () => {
      act(() => {
        useExperimentStore.getState().selectExperiment('abc-123')
        useExperimentStore.getState().selectExperiment(null)
      })
      expect(useExperimentStore.getState().selectedId).toBeNull()
    })
  })

  // The store subscribes to Wails events and re-fetches on mutations.
  describe('initialize', () => {
    it('fetches experiments on init', async () => {
      await CreateExperiment('exp-1', '{}')

      await act(async () => {
        useExperimentStore.getState().initialize()
        // Allow the async fetch inside initialize to complete
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(useExperimentStore.getState().experiments).toHaveLength(1)
    })

    it('re-fetches when experiment event is emitted', async () => {
      await act(async () => {
        useExperimentStore.getState().initialize()
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(useExperimentStore.getState().experiments).toHaveLength(0)

      // Create an experiment via mock, then emit the event
      await CreateExperiment('exp-new', '{}')

      await act(async () => {
        EventsEmit('experiment:created')
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(useExperimentStore.getState().experiments).toHaveLength(1)
    })
  })
})
