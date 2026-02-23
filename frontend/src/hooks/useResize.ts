import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

type ResizeDirection = 'horizontal' | 'vertical'

interface UseResizeOptions {
  direction: ResizeDirection
  initialSize: number
  minSize: number
  maxSize?: number
  onResizeEnd?: (size: number) => void
  /** Ref to the container element. When provided, the resize max is clamped
   *  to containerHeight - reserveSpace (measured once at drag start). */
  containerRef?: RefObject<HTMLElement | null>
  /** Pixels to reserve in the container for sibling panels (used with containerRef). */
  reserveSpace?: number
}

interface UseResizeReturn {
  size: number
  handleMouseDown: (e: React.MouseEvent) => void
  isResizing: boolean
}

export function useResize({
  direction,
  initialSize,
  minSize,
  maxSize = Infinity,
  onResizeEnd,
  containerRef,
  reserveSpace = 0,
}: UseResizeOptions): UseResizeReturn {
  const [size, setSize] = useState(initialSize)
  const [isResizing, setIsResizing] = useState(false)
  const startPosRef = useRef(0)
  const startSizeRef = useRef(0)
  const currentSizeRef = useRef(size)
  const onResizeEndRef = useRef(onResizeEnd)
  const dragMaxRef = useRef(maxSize)

  // Keep callback ref updated without causing effect re-runs
  onResizeEndRef.current = onResizeEnd

  // Sync size when initialSize changes (e.g., after async layout load)
  useEffect(() => {
    setSize(initialSize)
    currentSizeRef.current = initialSize
  }, [initialSize])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)
      startPosRef.current = direction === 'vertical' ? e.clientX : e.clientY
      startSizeRef.current = size

      // Measure container at drag start to get a stable max
      if (containerRef?.current && containerRef.current.clientHeight > 0) {
        const containerSize = containerRef.current.clientHeight
        dragMaxRef.current = Math.max(minSize, containerSize - reserveSpace)
      } else {
        dragMaxRef.current = maxSize
      }

      // Add body class for cursor
      document.body.classList.add(direction === 'vertical' ? 'resizing-col' : 'resizing-row')
    },
    [direction, size, containerRef, reserveSpace, maxSize, minSize]
  )

  useEffect(() => {
    if (!isResizing) return

    const effectiveMax = dragMaxRef.current

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'vertical' ? e.clientX : e.clientY
      const delta = currentPos - startPosRef.current
      const newSize = Math.max(minSize, Math.min(effectiveMax, startSizeRef.current + delta))

      currentSizeRef.current = newSize
      setSize(newSize)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.classList.remove('resizing-col', 'resizing-row')
      onResizeEndRef.current?.(currentSizeRef.current)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    // maxSize intentionally omitted — we snapshot the effective max into
    // dragMaxRef at drag-start (via containerRef measurement) so that the
    // limit stays stable for the duration of a single drag gesture.
  }, [isResizing, direction, minSize])

  return { size, handleMouseDown, isResizing }
}

// Hook for right panel (inverted - dragging left increases size)
export function useResizeInverted({
  direction,
  initialSize,
  minSize,
  maxSize = Infinity,
  onResizeEnd,
}: UseResizeOptions): UseResizeReturn {
  const [size, setSize] = useState(initialSize)
  const [isResizing, setIsResizing] = useState(false)
  const startPosRef = useRef(0)
  const startSizeRef = useRef(0)
  const currentSizeRef = useRef(size)
  const onResizeEndRef = useRef(onResizeEnd)

  onResizeEndRef.current = onResizeEnd

  // Sync size when initialSize changes (e.g., after async layout load)
  useEffect(() => {
    setSize(initialSize)
    currentSizeRef.current = initialSize
  }, [initialSize])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)
      startPosRef.current = direction === 'vertical' ? e.clientX : e.clientY
      startSizeRef.current = size

      document.body.classList.add(direction === 'vertical' ? 'resizing-col' : 'resizing-row')
    },
    [direction, size]
  )

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'vertical' ? e.clientX : e.clientY
      // Inverted: moving left (negative delta) increases size
      const delta = startPosRef.current - currentPos
      const newSize = Math.max(minSize, Math.min(maxSize, startSizeRef.current + delta))

      currentSizeRef.current = newSize
      setSize(newSize)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.classList.remove('resizing-col', 'resizing-row')
      onResizeEndRef.current?.(currentSizeRef.current)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, direction, minSize, maxSize])

  return { size, handleMouseDown, isResizing }
}

// Hook for output panel (inverted vertical - dragging up increases size)
export function useResizeVerticalInverted({
  initialSize,
  minSize,
  maxSize = Infinity,
  onResizeEnd,
}: Omit<UseResizeOptions, 'direction'>): UseResizeReturn {
  const [size, setSize] = useState(initialSize)
  const [isResizing, setIsResizing] = useState(false)
  const startPosRef = useRef(0)
  const startSizeRef = useRef(0)
  const currentSizeRef = useRef(size)
  const onResizeEndRef = useRef(onResizeEnd)

  onResizeEndRef.current = onResizeEnd

  // Sync size when initialSize changes (e.g., after async layout load)
  useEffect(() => {
    setSize(initialSize)
    currentSizeRef.current = initialSize
  }, [initialSize])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)
      startPosRef.current = e.clientY
      startSizeRef.current = size

      document.body.classList.add('resizing-row')
    },
    [size]
  )

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      // Inverted: moving up (negative delta) increases size
      const delta = startPosRef.current - e.clientY
      const newSize = Math.max(minSize, Math.min(maxSize, startSizeRef.current + delta))

      currentSizeRef.current = newSize
      setSize(newSize)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.classList.remove('resizing-row')
      onResizeEndRef.current?.(currentSizeRef.current)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, minSize, maxSize])

  return { size, handleMouseDown, isResizing }
}
