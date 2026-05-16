import { act } from '@testing-library/react'
import { __resetAlertsStore, useAlertsStore } from '@stores/alertsStore'
import {
  __addMockAlert,
  __resetMockState,
  __setMockDetections,
} from '../../__mocks__/wailsjs/go/main/App'
import { EventsEmit } from '../../__mocks__/wailsjs/runtime/runtime'

beforeEach(() => {
  jest.useRealTimers()
  __resetMockState()
  __resetAlertsStore()
})

describe('useAlertsStore', () => {
  it('fetchDetections populates backend detection results', async () => {
    __setMockDetections('exp-1', [
      {
        type: 'kl_drift',
        pattern: 'KL Drift',
        status: 'elevated',
        confidence: 0.72,
        step: 6,
        data: '{"kl":"up"}',
      },
    ])

    await act(async () => {
      await useAlertsStore.getState().fetchDetections('exp-1')
    })

    const detections = useAlertsStore.getState().detections['exp-1']
    expect(detections).toHaveLength(1)
    expect(detections[0]).toMatchObject({
      type: 'kl_drift',
      pattern: 'KL Drift',
      status: 'elevated',
      confidence: 0.72,
      step: 6,
    })
  })

  it('fetchAlerts populates persisted alerts', async () => {
    __addMockAlert('exp-1', {
      type: 'sycophancy',
      pattern: 'Sycophancy',
      step: 10,
      confidence: 0.81,
      status: 'elevated',
    })

    await act(async () => {
      await useAlertsStore.getState().fetchAlerts('exp-1')
    })

    const alerts = useAlertsStore.getState().alerts['exp-1']
    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({
      type: 'sycophancy',
      pattern: 'Sycophancy',
      confidence: 0.81,
    })
  })

  it('refreshes detections when alerts are updated', async () => {
    jest.useFakeTimers()
    __setMockDetections('exp-1', [
      {
        type: 'reward_collapse',
        pattern: 'Reward Collapse',
        status: 'monitoring',
        confidence: 0.52,
        step: 12,
      },
    ])

    useAlertsStore.getState().initialize()
    act(() => {
      EventsEmit('alerts:updated', { experimentId: 'exp-1' })
      jest.advanceTimersByTime(250)
    })

    await act(async () => {
      await Promise.resolve()
    })

    const detections = useAlertsStore.getState().detections['exp-1']
    expect(detections[0]).toMatchObject({
      type: 'reward_collapse',
      status: 'monitoring',
      confidence: 0.52,
    })
  })
})
