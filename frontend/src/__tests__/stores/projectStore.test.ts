import { act } from '@testing-library/react'
import { useProjectStore, __resetProjectStoreInitialized } from '@stores/projectStore'
import {
  __resetMockState,
  __setCurrentProjectStatus,
  __setRecentProjects,
} from '../../__mocks__/wailsjs/go/main/App'
import { __resetListeners, EventsEmit } from '../../__mocks__/wailsjs/runtime/runtime'
import { project } from '../../__mocks__/wailsjs/go/models'

function makeProject(overrides: Partial<Record<string, unknown>> = {}): project.Project {
  const now = Math.floor(Date.now() / 1000)
  return new project.Project({
    id: 'proj-1',
    name: 'reward-lab',
    path: '/tmp/reward-lab',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  })
}

beforeEach(() => {
  __resetMockState()
  __resetListeners()
  __resetProjectStoreInitialized()
})

describe('projectStore', () => {
  it('fetchStatus populates project and degraded state', async () => {
    const currentProject = makeProject()
    __setCurrentProjectStatus({
      project: currentProject,
      configError: 'invalid flux.yaml',
      warnings: ['missing required field: name'],
      degraded: true,
    })

    await act(async () => {
      await useProjectStore.getState().fetchStatus()
    })

    const state = useProjectStore.getState()
    expect(state.currentProject?.id).toBe(currentProject.id)
    expect(state.degraded).toBe(true)
    expect(state.configError).toBe('invalid flux.yaml')
    expect(state.warnings).toEqual(['missing required field: name'])
  })

  it('initialize fetches status and recent projects', async () => {
    const currentProject = makeProject()
    __setCurrentProjectStatus({ project: currentProject })
    __setRecentProjects([
      new project.RecentProject({ path: currentProject.path, name: currentProject.name }),
    ])

    await act(async () => {
      useProjectStore.getState().initialize()
      await Promise.resolve()
      await Promise.resolve()
    })

    const state = useProjectStore.getState()
    expect(state.currentProject?.id).toBe(currentProject.id)
    expect(state.recentProjects).toHaveLength(1)
    expect(state.recentProjects[0].name).toBe(currentProject.name)
  })

  it('re-fetches project state on project events', async () => {
    await act(async () => {
      useProjectStore.getState().initialize()
      await Promise.resolve()
      await Promise.resolve()
    })

    const currentProject = makeProject({ id: 'proj-2', name: 'fallback-project' })
    __setCurrentProjectStatus({
      project: currentProject,
      configError: 'bad yaml',
      degraded: true,
    })
    __setRecentProjects([
      new project.RecentProject({ path: currentProject.path, name: currentProject.name }),
    ])

    await act(async () => {
      EventsEmit('project:status')
      await Promise.resolve()
      await Promise.resolve()
    })

    const state = useProjectStore.getState()
    expect(state.currentProject?.id).toBe('proj-2')
    expect(state.degraded).toBe(true)
    expect(state.recentProjects[0].name).toBe('fallback-project')
  })
})
