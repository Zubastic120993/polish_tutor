interface Props {
  amplitude?: number
}

const BAR_COUNT = 15
const HEIGHT_PATTERN = [0.4, 0.8, 0.6, 0.9, 0.5]

export function WaveformVisualizer({ amplitude = 0 }: Props) {
  const normalized = Math.max(0, Math.min(1, amplitude))

  return (
    <div className="flex h-12 items-end gap-1" aria-hidden="true">
      {Array.from({ length: BAR_COUNT }).map((_, index) => {
        const patternValue = HEIGHT_PATTERN[index % HEIGHT_PATTERN.length]
        const height = 6 + normalized * 40 * (0.5 + patternValue)
        return (
          <span
            key={index}
            style={{ height: `${height}px` }}
            className="w-1 rounded-full bg-blue-500/80 opacity-80 transition-[height] duration-150 ease-out"
          />
        )
      })}
    </div>
  )
}
