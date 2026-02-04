import * as fs from 'fs'
import * as path from 'path'

describe('Design Tokens', () => {
  const tokensPath = path.resolve(__dirname, '../styles/tokens.css')
  const layoutPath = path.resolve(__dirname, '../styles/components/layout.css')

  describe('Token definitions', () => {
    it('defines all required typography tokens', () => {
      const cssContent = fs.readFileSync(tokensPath, 'utf-8')

      const requiredTokens = [
        // Font families
        '--font-ui',
        '--font-mono',
        // Font sizes
        '--font-size-xs',
        '--font-size-sm',
        '--font-size-md',
        '--font-size-lg',
        '--font-size-xl',
        '--font-size-2xl',
        // Font weights
        '--font-weight-normal',
        '--font-weight-medium',
        '--font-weight-semibold',
        '--font-weight-bold',
        // Line heights
        '--line-height-tight',
        '--line-height-normal',
        '--line-height-relaxed',
        // Letter spacing
        '--letter-spacing-wide',
      ]

      requiredTokens.forEach((token) => {
        expect(cssContent).toContain(token)
      })
    })

    it('font-ui references Inter as primary font', () => {
      const cssContent = fs.readFileSync(tokensPath, 'utf-8')
      expect(cssContent).toMatch(/--font-ui:.*'Inter'/)
    })

    it('font-mono references JetBrains Mono as primary font', () => {
      const cssContent = fs.readFileSync(tokensPath, 'utf-8')
      expect(cssContent).toMatch(/--font-mono:.*'JetBrains Mono'/)
    })

    it('defines all required color tokens', () => {
      const cssContent = fs.readFileSync(tokensPath, 'utf-8')

      const requiredTokens = [
        // Backgrounds
        '--color-bg-base',
        '--color-bg-panel',
        '--color-bg-elevated',
        '--color-bg-content',
        '--color-bg-hover',
        '--color-bg-active',
        '--color-bg-chrome',
        '--color-bg-chrome-hover',
        // Text
        '--color-text-primary',
        '--color-text-secondary',
        '--color-text-muted',
        '--color-text-accent',
        // Accent
        '--color-accent',
        '--color-accent-bright',
        '--color-accent-dim',
        '--color-accent-muted',
        '--color-accent-glow',
        // Status
        '--color-success',
        '--color-success-dim',
        '--color-warning',
        '--color-warning-subtle',
        '--color-warning-dim',
        '--color-warning-light',
        '--color-warning-medium',
        '--color-warning-muted',
        '--color-error',
        '--color-error-dim',
        // Charts
        '--color-chart-1',
        '--color-chart-2',
        '--color-chart-3',
        '--color-chart-4',
        '--color-chart-5',
        // Borders
        '--color-border-default',
        '--color-border-muted',
        '--color-border-subtle',
        // Icons
        '--color-icon-folder',
        '--color-icon-folder-open',
      ]

      requiredTokens.forEach((token) => {
        expect(cssContent).toContain(token)
      })
    })
  })

  describe('Token usage in CSS', () => {
    it('uses CSS variables for all colors in layout.css (no hard-coded hex)', () => {
      const cssContent = fs.readFileSync(layoutPath, 'utf-8')

      // Find all hex color values
      const hexPattern = /#[0-9a-fA-F]{3,8}\b/g
      const matches = cssContent.match(hexPattern) || []

      // Should have no hard-coded hex colors
      expect(matches).toHaveLength(0)
    })

    it('uses var() for color properties', () => {
      const cssContent = fs.readFileSync(layoutPath, 'utf-8')
      const lines = cssContent.split('\n')

      const colorPropertyLines = lines.filter((line) => {
        const trimmed = line.trim()
        // Skip comments
        if (trimmed.startsWith('/*') || trimmed.startsWith('*')) return false
        // Match color-related properties
        return (
          trimmed.includes('color:') ||
          trimmed.includes('background-color:') ||
          trimmed.includes('border-color:')
        )
      })

      colorPropertyLines.forEach((line) => {
        const usesVariable = line.includes('var(--')
        const usesKeyword = /transparent|inherit|currentColor|none/.test(line)
        const isEmpty = line.includes(': ;') || line.includes(':;')

        if (!usesVariable && !usesKeyword && !isEmpty) {
          // This will fail and show the problematic line
          expect(`Line should use CSS variable: ${line.trim()}`).toBe('')
        }
      })
    })
  })
})
