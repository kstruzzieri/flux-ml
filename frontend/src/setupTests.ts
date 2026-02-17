import '@testing-library/jest-dom'
import { randomUUID } from 'node:crypto'
import { __resetMockLayout } from './__mocks__/wailsjs/go/main/App'
import { __resetListeners } from './__mocks__/wailsjs/runtime/runtime'

// Polyfill crypto.randomUUID for jsdom (not available in jsdom by default)
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    value: randomUUID,
    writable: true,
    configurable: true,
  })
}

// Polyfill window.matchMedia for jsdom (required by uPlot)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Reset Wails mock state before each test
beforeEach(() => {
  __resetMockLayout()
  __resetListeners()
})
