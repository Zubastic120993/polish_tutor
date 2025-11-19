import type { PropsWithChildren } from 'react'

interface ShakeProps extends PropsWithChildren {
  active?: boolean
  className?: string
}

export function Shake({ active = false, className = '', children }: ShakeProps) {
  return (
    <div className={`${className} ${active ? 'animate-shake' : ''}`.trim()}>
      {children}
    </div>
  )
}
