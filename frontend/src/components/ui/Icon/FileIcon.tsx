import {
  PythonIcon,
  YamlIcon,
  MarkdownIcon,
  TextFileIcon,
  GenericFileIcon,
  JavascriptIcon,
  TypescriptIcon,
  GoIcon,
  RustIcon,
  JsonIcon,
  BashIcon,
  Html5Icon,
  Css3Icon,
  DockerIcon,
} from './icons'

export interface FileIconProps {
  /** File extension (without the dot) */
  extension?: string
  /** Additional CSS class */
  className?: string
  /** Test ID for testing */
  'data-testid'?: string
}

/** Icon component that accepts a size prop (library and custom icons have different size types) */
type SizeableIcon = React.ComponentType<{ size?: string | number }>

interface ExtensionEntry {
  Component: SizeableIcon
  className: string
}

const EXTENSION_MAP: Record<string, ExtensionEntry> = {
  py: { Component: PythonIcon, className: 'icon--python' },
  yaml: { Component: YamlIcon, className: 'icon--yaml' },
  yml: { Component: YamlIcon, className: 'icon--yaml' },
  md: { Component: MarkdownIcon, className: 'icon--markdown' },
  js: { Component: JavascriptIcon, className: 'icon--javascript' },
  jsx: { Component: JavascriptIcon, className: 'icon--javascript' },
  ts: { Component: TypescriptIcon, className: 'icon--typescript' },
  tsx: { Component: TypescriptIcon, className: 'icon--typescript' },
  go: { Component: GoIcon, className: 'icon--go' },
  rs: { Component: RustIcon, className: 'icon--rust' },
  json: { Component: JsonIcon, className: 'icon--json' },
  sh: { Component: BashIcon, className: 'icon--bash' },
  bash: { Component: BashIcon, className: 'icon--bash' },
  html: { Component: Html5Icon, className: 'icon--html' },
  css: { Component: Css3Icon, className: 'icon--css' },
  dockerfile: { Component: DockerIcon, className: 'icon--docker' },
  txt: { Component: TextFileIcon, className: 'icon--text-file' },
}

/**
 * FileIcon component that selects the appropriate icon based on file extension.
 * Uses devicons-react for language icons and custom SVGs for generic files.
 * Falls back to GenericFileIcon for unknown extensions.
 */
export function FileIcon({
  ref,
  extension,
  className,
  'data-testid': testId,
}: FileIconProps & { ref?: React.Ref<HTMLSpanElement> }) {
  const entry = extension ? EXTENSION_MAP[extension.toLowerCase()] : undefined

  if (!entry) {
    return (
      <span ref={ref} className={`icon--generic-file ${className || ''}`} data-testid={testId}>
        <GenericFileIcon />
      </span>
    )
  }

  const { Component, className: iconClassName } = entry

  return (
    <span ref={ref} className={`${iconClassName} ${className || ''}`} data-testid={testId}>
      <Component size="100%" />
    </span>
  )
}
