import { createInitialState, wizardReducer } from '../../../components/project/wizardReducer'

describe('wizardReducer', () => {
  it('defaults blank projects to no demo experiments', () => {
    let state = createInitialState()

    state = wizardReducer(state, { type: 'SET_TEMPLATE', template: 'blank' })

    expect(state.seedDemo).toBe(false)
  })

  it('defaults reward-model projects to demo experiments enabled', () => {
    let state = createInitialState()

    state = wizardReducer(state, { type: 'SET_TEMPLATE', template: 'reward-model' })

    expect(state.seedDemo).toBe(true)
  })

  it('recomputes the generated location when the default projects dir loads later', () => {
    let state = createInitialState()

    state = wizardReducer(state, { type: 'SET_TEMPLATE', template: 'reward-model' })
    expect(state.location).toBe('reward-model-v1')

    state = wizardReducer(state, { type: 'SET_DEFAULT_DIR', dir: '/tmp/projects' })
    expect(state.location).toBe('/tmp/projects/reward-model-v1')
  })

  it('preserves a manually edited location when the default projects dir changes', () => {
    let state = createInitialState()

    state = wizardReducer(state, { type: 'SET_TEMPLATE', template: 'reward-model' })
    state = wizardReducer(state, {
      type: 'SET_LOCATION',
      location: '/custom/location',
      manual: true,
    })

    state = wizardReducer(state, { type: 'SET_DEFAULT_DIR', dir: '/tmp/projects' })
    expect(state.location).toBe('/custom/location')
  })
})
