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

    it('updates selectedId to a different experiment', () => {
      act(() => {
        useExperimentStore.getState().selectExperiment('abc-123')
        useExperimentStore.getState().selectExperiment('def-456')
      })
      expect(useExperimentStore.getState().selectedId).toBe('def-456')
    })
  })

  // Auto-select ensures one experiment is always active when the list is non-empty.
  describe('auto-select', () => {
    it('auto-selects first experiment after fetch when selectedId is null', async () => {
      await CreateExperiment('exp-1', '{}')
      await CreateExperiment('exp-2', '{}')

      await act(async () => {
        await useExperimentStore.getState().fetchExperiments()
      })

      const state = useExperimentStore.getState()
      expect(state.selectedId).toBe(state.experiments[0].id)
    })

    it('preserves selectedId if experiment still exists in list', async () => {
      const exp = await CreateExperiment('exp-1', '{}')

      useExperimentStore.setState({ selectedId: exp.id })

      await act(async () => {
        await useExperimentStore.getState().fetchExperiments()
      })

      expect(useExperimentStore.getState().selectedId).toBe(exp.id)
    })

    it('auto-selects first remaining if selected experiment is removed', async () => {
      await CreateExperiment('exp-remaining', '{}')

      useExperimentStore.setState({ selectedId: 'deleted-id' })

      await act(async () => {
        await useExperimentStore.getState().fetchExperiments()
      })

      const state = useExperimentStore.getState()
      expect(state.selectedId).toBe(state.experiments[0].id)
    })

    it('sets selectedId to null when list becomes empty', async () => {
      useExperimentStore.setState({ selectedId: 'old-id' })

      await act(async () => {
        await useExperimentStore.getState().fetchExperiments()
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
        // Wait for debounce (100ms) + async fetch
        await new Promise((r) => setTimeout(r, 150))
      })

      expect(useExperimentStore.getState().experiments).toHaveLength(1)
    })
  })
})
