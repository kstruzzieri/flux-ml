// Mock for Wails Go models - used in Jest tests
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace annotation {
  export class Annotation {
    id: number = 0
    experiment_id: string = ''
    step: number = 0
    type: string = ''
    label: string = ''
    data: string = ''
    created_at: number = 0

    static createFrom(source: Record<string, unknown> = {}) {
      return new Annotation(source)
    }

    constructor(source: Record<string, unknown> = {}) {
      if ('string' === typeof source) source = JSON.parse(source)
      this.id = source['id'] as number
      this.experiment_id = source['experiment_id'] as string
      this.step = source['step'] as number
      this.type = source['type'] as string
      this.label = source['label'] as string
      this.data = source['data'] as string
      this.created_at = source['created_at'] as number
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace alerts {
  export class Alert {
    id: number = 0
    experiment_id: string = ''
    type: string = ''
    pattern: string = ''
    step: number = 0
    confidence: number = 0
    score_kind: string = ''
    status: string = ''
    data: string = ''
    acknowledged: boolean = false
    created_at: number = 0
    resolved_at?: number

    static createFrom(source: Record<string, unknown> = {}) {
      return new Alert(source)
    }

    constructor(source: Record<string, unknown> = {}) {
      if ('string' === typeof source) source = JSON.parse(source)
      this.id = source['id'] as number
      this.experiment_id = source['experiment_id'] as string
      this.type = source['type'] as string
      this.pattern = source['pattern'] as string
      this.step = source['step'] as number
      this.confidence = source['confidence'] as number
      this.score_kind = source['score_kind'] as string
      this.status = source['status'] as string
      this.data = source['data'] as string
      this.acknowledged = source['acknowledged'] as boolean
      this.created_at = source['created_at'] as number
      this.resolved_at = source['resolved_at'] as number | undefined
    }
  }

  export class DetectionResult {
    type: string = ''
    pattern: string = ''
    status: string = ''
    confidence?: number
    score_kind: string = ''
    step: number = 0
    data: string = ''

    static createFrom(source: Record<string, unknown> = {}) {
      return new DetectionResult(source)
    }

    constructor(source: Record<string, unknown> = {}) {
      if ('string' === typeof source) source = JSON.parse(source)
      this.type = source['type'] as string
      this.pattern = source['pattern'] as string
      this.status = source['status'] as string
      this.confidence = source['confidence'] as number | undefined
      this.score_kind = source['score_kind'] as string
      this.step = source['step'] as number
      this.data = source['data'] as string
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace event {
  export class Event {
    id: number = 0
    experiment_id: string = ''
    timestamp: number = 0
    type: string = ''
    data: string = ''

    static createFrom(source: Record<string, unknown> = {}) {
      return new Event(source)
    }

    constructor(source: Record<string, unknown> = {}) {
      if ('string' === typeof source) source = JSON.parse(source)
      this.id = source['id'] as number
      this.experiment_id = source['experiment_id'] as string
      this.timestamp = source['timestamp'] as number
      this.type = source['type'] as string
      this.data = source['data'] as string
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace experiment {
  export class Experiment {
    id: string = ''
    name: string = ''
    config: string = ''
    parentId?: string
    projectId?: string
    status: string = ''
    createdAt: number = 0
    updatedAt: number = 0

    static createFrom(source: Record<string, unknown> = {}) {
      return new Experiment(source)
    }

    constructor(source: Record<string, unknown> = {}) {
      if ('string' === typeof source) source = JSON.parse(source)
      this.id = source['id'] as string
      this.name = source['name'] as string
      this.config = source['config'] as string
      this.parentId = source['parentId'] as string | undefined
      this.projectId = source['projectId'] as string | undefined
      this.status = source['status'] as string
      this.createdAt = source['createdAt'] as number
      this.updatedAt = source['updatedAt'] as number
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace main {
  export class AppInfo {
    name: string = ''
    version: string = ''

    static createFrom(source: Record<string, unknown> = {}) {
      return new AppInfo(source)
    }

    constructor(source: Record<string, unknown> = {}) {
      if ('string' === typeof source) source = JSON.parse(source)
      this.name = source['name'] as string
      this.version = source['version'] as string
    }
  }

  export class CurrentProjectStatus {
    project?: project.Project
    config?: project.FluxConfig
    configError: string = ''
    warnings: string[] = []
    degraded: boolean = false

    static createFrom(source: Record<string, unknown> = {}) {
      return new CurrentProjectStatus(source)
    }

    constructor(source: Record<string, unknown> = {}) {
      if ('string' === typeof source) source = JSON.parse(source)
      this.project = source['project'] as project.Project | undefined
      this.config = source['config'] as project.FluxConfig | undefined
      this.configError = (source['configError'] as string) || ''
      this.warnings = (source['warnings'] as string[]) || []
      this.degraded = (source['degraded'] as boolean) || false
    }
  }

  export class LayoutState {
    leftWidth: number = 280
    rightWidth: number = 320
    outputHeight: number = 180
    leftTopHeight: number = 500
    rightTopHeight: number = 450
    leftCollapsed: boolean = false
    rightCollapsed: boolean = false
    outputCollapsed: boolean = false

    static createFrom(source: Record<string, unknown> = {}) {
      return new LayoutState(source)
    }

    constructor(source: Record<string, unknown> = {}) {
      if ('string' === typeof source) source = JSON.parse(source)
      this.leftWidth = source['leftWidth'] as number
      this.rightWidth = source['rightWidth'] as number
      this.outputHeight = source['outputHeight'] as number
      this.leftTopHeight = source['leftTopHeight'] as number
      this.rightTopHeight = source['rightTopHeight'] as number
      this.leftCollapsed = source['leftCollapsed'] as boolean
      this.rightCollapsed = source['rightCollapsed'] as boolean
      this.outputCollapsed = source['outputCollapsed'] as boolean
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace metrics {
  export class Metric {
    experiment_id: string = ''
    step: number = 0
    name: string = ''
    value: number = 0
    timestamp: number = 0

    static createFrom(source: Record<string, unknown> = {}) {
      return new Metric(source)
    }

    constructor(source: Record<string, unknown> = {}) {
      if ('string' === typeof source) source = JSON.parse(source)
      this.experiment_id = source['experiment_id'] as string
      this.step = source['step'] as number
      this.name = source['name'] as string
      this.value = source['value'] as number
      this.timestamp = source['timestamp'] as number
    }
  }

  export class RewardSignal {
    experiment_id: string = ''
    step: number = 0
    component: string = ''
    value: number = 0
    distribution: string = ''

    static createFrom(source: Record<string, unknown> = {}) {
      return new RewardSignal(source)
    }

    constructor(source: Record<string, unknown> = {}) {
      if ('string' === typeof source) source = JSON.parse(source)
      this.experiment_id = source['experiment_id'] as string
      this.step = source['step'] as number
      this.component = source['component'] as string
      this.value = source['value'] as number
      this.distribution = source['distribution'] as string
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace project {
  export class FluxConfig {
    version: number = 1
    name: string = ''
    description?: string
    ignore?: string[]
    defaults?: { [key: string]: string }

    static createFrom(source: Record<string, unknown> = {}) {
      return new FluxConfig(source)
    }

    constructor(source: Record<string, unknown> = {}) {
      if ('string' === typeof source) source = JSON.parse(source)
      this.version = (source['version'] as number) || 1
      this.name = (source['name'] as string) || ''
      this.description = source['description'] as string | undefined
      this.ignore = source['ignore'] as string[] | undefined
      this.defaults = source['defaults'] as { [key: string]: string } | undefined
    }
  }

  export class Project {
    id: string = ''
    name: string = ''
    path: string = ''
    createdAt: number = 0
    updatedAt: number = 0

    static createFrom(source: Record<string, unknown> = {}) {
      return new Project(source)
    }

    constructor(source: Record<string, unknown> = {}) {
      if ('string' === typeof source) source = JSON.parse(source)
      this.id = source['id'] as string
      this.name = source['name'] as string
      this.path = source['path'] as string
      this.createdAt = source['createdAt'] as number
      this.updatedAt = source['updatedAt'] as number
    }
  }

  export class RecentProject {
    path: string = ''
    name: string = ''

    static createFrom(source: Record<string, unknown> = {}) {
      return new RecentProject(source)
    }

    constructor(source: Record<string, unknown> = {}) {
      if ('string' === typeof source) source = JSON.parse(source)
      this.path = source['path'] as string
      this.name = source['name'] as string
    }
  }
}
