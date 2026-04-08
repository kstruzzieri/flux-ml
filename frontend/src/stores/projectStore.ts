import { create } from 'zustand'
import {
  GetCurrentProjectStatus,
  CloseProject,
  ListRecentProjects,
} from '../../wailsjs/go/main/App'
import { EventsOn } from '../../wailsjs/runtime/runtime'
import type { main, project } from '../../wailsjs/go/models'

interface ProjectState {
  currentProject: project.Project | null
  config: project.FluxConfig | null
  configError: string
  warnings: string[]
  degraded: boolean
  recentProjects: project.RecentProject[]
  loading: boolean
  hydrated: boolean

  fetchStatus: () => Promise<void>
  fetchRecentProjects: () => Promise<void>
  closeProject: () => Promise<void>
  initialize: () => void
}

let _initialized = false
let _unsubscribe: (() => void) | null = null

export function __resetProjectStoreInitialized(): void {
  _initialized = false
  if (_unsubscribe) {
    _unsubscribe()
    _unsubscribe = null
  }
  useProjectStore.setState({
    currentProject: null,
    config: null,
    configError: '',
    warnings: [],
    degraded: false,
    recentProjects: [],
    loading: false,
    hydrated: false,
  })
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  config: null,
  configError: '',
  warnings: [],
  degraded: false,
  recentProjects: [],
  loading: false,
  hydrated: false,

  fetchStatus: async () => {
    set({ loading: true })
    try {
      const status: main.CurrentProjectStatus = await GetCurrentProjectStatus()
      set({
        currentProject: status.project ?? null,
        config: status.config ?? null,
        configError: status.configError || '',
        warnings: status.warnings || [],
        degraded: status.degraded || false,
        loading: false,
        hydrated: true,
      })
    } catch (err) {
      set({
        loading: false,
        hydrated: true,
        configError: err instanceof Error ? err.message : String(err),
      })
    }
  },

  fetchRecentProjects: async () => {
    try {
      const recents = await ListRecentProjects()
      set({ recentProjects: recents })
    } catch {
      // Recent projects are non-critical — don't block on failure
    }
  },

  closeProject: async () => {
    try {
      await CloseProject()
    } catch (err) {
      console.error('Failed to close project:', err)
    }
    // Always reset local state — the user intends to close regardless
    set({
      currentProject: null,
      config: null,
      configError: '',
      warnings: [],
      degraded: false,
    })
  },

  initialize: () => {
    if (_initialized) return
    _initialized = true

    const { fetchStatus, fetchRecentProjects } = get()
    void Promise.all([fetchStatus(), fetchRecentProjects()])

    const projectEvents = [
      'project:created',
      'project:opened',
      'project:imported',
      'project:closed',
      'project:status',
    ]
    const unsubs = projectEvents.map((eventName) =>
      EventsOn(eventName, () => {
        fetchStatus()
        fetchRecentProjects()
      })
    )
    _unsubscribe = () => {
      unsubs.forEach((unsub) => {
        if (typeof unsub === 'function') unsub()
      })
    }
  },
}))
