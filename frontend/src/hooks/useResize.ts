import { useCallback, useEffect, useRef, useState } from 'react'

type ResizeDirection = 'horizontal' | 'vertical'

interface UseResizeOptions {
  direction: ResizeDirection
  initialSize: number
  minSize: number
  maxSize?: number
  onResize?: (size: number) => void
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
  onResize,
}: UseResizeOptions): UseResizeReturn {
  const [size, setSize] = useState(initialSize)
  const [isResizing, setIsResizing] = useState(false)
  const startPosRef = useRef(0)
  const startSizeRef = useRef(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)
      startPosRef.current = direction === 'vertical' ? e.clientX : e.clientY
      startSizeRef.current = size

      // Add body class for cursor
      document.body.classList.add(direction === 'vertical' ? 'resizing-col' : 'resizing-row')
    },
    [direction, size]
  )

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'vertical' ? e.clientX : e.clientY
      const delta = currentPos - startPosRef.current
      const newSize = Math.max(minSize, Math.min(maxSize, startSizeRef.current + delta))

      setSize(newSize)
      onResize?.(newSize)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.classList.remove('resizing-col', 'resizing-row')
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, direction, minSize, maxSize, onResize])

  return { size, handleMouseDown, isResizing }
}

// Hook for right panel (inverted - dragging left increases size)
export function useResizeInverted({
  direction,
  initialSize,
  minSize,
  maxSize = Infinity,
  onResize,
}: UseResizeOptions): UseResizeReturn {
  const [size, setSize] = useState(initialSize)
  const [isResizing, setIsResizing] = useState(false)
  const startPosRef = useRef(0)
  const startSizeRef = useRef(0)

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

      setSize(newSize)
      onResize?.(newSize)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.classList.remove('resizing-col', 'resizing-row')
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, direction, minSize, maxSize, onResize])

  return { size, handleMouseDown, isResizing }
}

// Hook for output panel (inverted vertical - dragging up increases size)
export function useResizeVerticalInverted({
  initialSize,
  minSize,
  maxSize = Infinity,
  onResize,
}: Omit<UseResizeOptions, 'direction'>): UseResizeReturn {
  const [size, setSize] = useState(initialSize)
  const [isResizing, setIsResizing] = useState(false)
  const startPosRef = useRef(0)
  const startSizeRef = useRef(0)

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

      setSize(newSize)
      onResize?.(newSize)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.classList.remove('resizing-row')
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, minSize, maxSize, onResize])

  return { size, handleMouseDown, isResizing }
}
