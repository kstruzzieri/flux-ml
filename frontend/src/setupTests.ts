import '@testing-library/jest-dom'
import { __resetMockLayout } from './__mocks__/wailsjs/go/main/App'
import { __resetListeners } from './__mocks__/wailsjs/runtime/runtime'

// Reset Wails mock state before each test
beforeEach(() => {
  __resetMockLayout()
  __resetListeners()
})
