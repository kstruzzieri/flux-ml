// Mock for Wails Go models - used in Jest tests
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

  export class LayoutState {
    leftWidth: number = 280
    rightWidth: number = 320
    outputHeight: number = 180
    leftTopHeight: number = 200
    rightTopHeight: number = 200
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
