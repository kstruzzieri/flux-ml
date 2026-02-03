// Mock for Wails Go models - used in Jest tests
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
