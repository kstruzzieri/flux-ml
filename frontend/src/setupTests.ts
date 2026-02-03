import '@testing-library/jest-dom'
import { __resetMockLayout } from './__mocks__/wailsjs/go/main/App'

// Reset Wails mock state before each test
beforeEach(() => {
  __resetMockLayout()
})
