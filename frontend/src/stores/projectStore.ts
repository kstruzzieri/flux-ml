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

  fetchStatus: () => Promise<void>
  fetchRecentProjects: () => Promise<void>
  closeProject: () => Promise<void>
  initialize: () => void
}

let _initialized = false

export function __resetProjectStoreInitialized(): void {
  _initialized = false
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  config: null,
  configError: '',
  warnings: [],
  degraded: false,
  recentProjects: [],
  loading: false,

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
      })
    } catch (err) {
      set({
        loading: false,
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
    await CloseProject()
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
    fetchStatus()
    fetchRecentProjects()

    const projectEvents = [
      'project:created',
      'project:opened',
      'project:imported',
      'project:closed',
      'project:status',
    ]
    projectEvents.forEach((eventName) => {
      EventsOn(eventName, () => {
        fetchStatus()
        fetchRecentProjects()
      })
    })
  },
}))
