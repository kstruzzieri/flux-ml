// Mock for Wails Go bindings - used in Jest tests
import { main } from '../models'

const DEFAULT_LAYOUT: main.LayoutState = {
  leftWidth: 280,
  rightWidth: 320,
  outputHeight: 180,
  leftTopHeight: 200,
  rightTopHeight: 200,
  leftCollapsed: false,
  rightCollapsed: false,
  outputCollapsed: false,
} as main.LayoutState

let savedLayout: main.LayoutState = { ...DEFAULT_LAYOUT } as main.LayoutState

export function GetLayout(): Promise<main.LayoutState> {
  return Promise.resolve({ ...savedLayout })
}

export function SaveLayout(layout: main.LayoutState): Promise<void> {
  savedLayout = { ...layout }
  return Promise.resolve()
}

export function GetAppInfo(): Promise<main.AppInfo> {
  return Promise.resolve({
    name: 'Flux',
    version: '0.1.0',
  } as main.AppInfo)
}

export function Greet(name: string): Promise<string> {
  return Promise.resolve(`Hello ${name}, It's show time!`)
}

// Test helper to reset the mock state
export function __resetMockLayout(): void {
  savedLayout = { ...DEFAULT_LAYOUT } as main.LayoutState
}
