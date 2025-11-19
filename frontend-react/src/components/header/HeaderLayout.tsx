import { memo } from 'react'
import { CefrBadge } from '../CefrBadge'
import { ProgressBarXP } from './ProgressBarXP'
import { StreakFlame } from './StreakFlame'
import { CefrProgressRing } from './CefrProgressRing'

interface Props {
  xp: number
  xpToNext: number
  xpLevelProgress: number
  xpFloatDelta: number
  xpFloatKey: number
  streak: number
  streakPulseKey: number
  cefrLevel: string
  cefrProgress: number
  isLoading: boolean
}

export const HeaderLayout = memo(function HeaderLayout({
  xp,
  xpToNext,
  xpLevelProgress,
  xpFloatDelta,
  xpFloatKey,
  streak,
  streakPulseKey,
  cefrLevel,
  cefrProgress,
  isLoading,
}: Props) {
  const streakPulseId = streakPulseKey ? String(streakPulseKey) : null
  const xpDelta = !isLoading && xpFloatDelta > 0 ? xpFloatDelta : null

  return (
    <header className="rounded-3xl border border-slate-100 bg-white/90 px-6 py-6 shadow-sm shadow-slate-200">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
              Patient Polish Tutor
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">Stay in the flow and earn XP.</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CefrBadge level={cefrLevel} isLoading={isLoading} />
            <CefrProgressRing level={cefrLevel} progress={cefrProgress} isLoading={isLoading} />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 lg:max-w-xl">
          <ProgressBarXP
            xp={xp}
            xpToNext={xpToNext}
            progress={xpLevelProgress}
            deltaKey={xpFloatKey}
            delta={xpDelta}
            isLoading={isLoading}
          />
          <StreakFlame streak={streak} pulseKey={streakPulseId} isLoading={isLoading} />
        </div>
      </div>
    </header>
  )
})
