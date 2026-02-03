import { useState, useCallback, useRef, useEffect } from 'react'
import { GetLayout, SaveLayout } from '../../wailsjs/go/main/App'

interface LayoutState {
  leftWidth: number
  rightWidth: number
  outputHeight: number
  leftTopHeight: number
  rightTopHeight: number
  leftCollapsed: boolean
  rightCollapsed: boolean
  outputCollapsed: boolean
}

const DEFAULT_LAYOUT: LayoutState = {
  leftWidth: 280,
  rightWidth: 320,
  outputHeight: 180,
  leftTopHeight: 200,
  rightTopHeight: 200,
  leftCollapsed: false,
  rightCollapsed: false,
  outputCollapsed: false,
}

export function useLayoutPersistence() {
  const [layout, setLayout] = useState<LayoutState>(DEFAULT_LAYOUT)
  const [isLoaded, setIsLoaded] = useState(false)
  const layoutRef = useRef<LayoutState>(DEFAULT_LAYOUT)

  // Load layout from Go backend on mount
  useEffect(() => {
    GetLayout()
      .then((savedLayout) => {
        const merged = { ...DEFAULT_LAYOUT, ...savedLayout }
        setLayout(merged)
        layoutRef.current = merged
        setIsLoaded(true)
      })
      .catch(() => {
        setIsLoaded(true)
      })
  }, [])

  // Save to Go backend
  const saveToStorage = useCallback(() => {
    SaveLayout(layoutRef.current).catch(() => {
      // Ignore save errors
    })
  }, [])

  const setLeftWidth = useCallback(
    (width: number) => {
      layoutRef.current = { ...layoutRef.current, leftWidth: width }
      saveToStorage()
    },
    [saveToStorage]
  )

  const setRightWidth = useCallback(
    (width: number) => {
      layoutRef.current = { ...layoutRef.current, rightWidth: width }
      saveToStorage()
    },
    [saveToStorage]
  )

  const setOutputHeight = useCallback(
    (height: number) => {
      layoutRef.current = { ...layoutRef.current, outputHeight: height }
      saveToStorage()
    },
    [saveToStorage]
  )

  const setLeftTopHeight = useCallback(
    (height: number) => {
      layoutRef.current = { ...layoutRef.current, leftTopHeight: height }
      saveToStorage()
    },
    [saveToStorage]
  )

  const setRightTopHeight = useCallback(
    (height: number) => {
      layoutRef.current = { ...layoutRef.current, rightTopHeight: height }
      saveToStorage()
    },
    [saveToStorage]
  )

  // Collapsed states use React state since they affect rendering
  const setLeftCollapsed = useCallback(
    (collapsed: boolean) => {
      layoutRef.current = { ...layoutRef.current, leftCollapsed: collapsed }
      setLayout((prev) => ({ ...prev, leftCollapsed: collapsed }))
      saveToStorage()
    },
    [saveToStorage]
  )

  const setRightCollapsed = useCallback(
    (collapsed: boolean) => {
      layoutRef.current = { ...layoutRef.current, rightCollapsed: collapsed }
      setLayout((prev) => ({ ...prev, rightCollapsed: collapsed }))
      saveToStorage()
    },
    [saveToStorage]
  )

  const setOutputCollapsed = useCallback(
    (collapsed: boolean) => {
      layoutRef.current = { ...layoutRef.current, outputCollapsed: collapsed }
      setLayout((prev) => ({ ...prev, outputCollapsed: collapsed }))
      saveToStorage()
    },
    [saveToStorage]
  )

  return {
    // Layout values
    ...layout,
    isLoaded,
    // Setters
    setLeftWidth,
    setRightWidth,
    setOutputHeight,
    setLeftTopHeight,
    setRightTopHeight,
    setLeftCollapsed,
    setRightCollapsed,
    setOutputCollapsed,
  }
}
