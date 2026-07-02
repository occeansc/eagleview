'use client'

import { useTheme } from './ThemeProvider'
import { SunIcon, MoonIcon } from './Icons'

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative shrink-0 w-[38px] h-[21px] rounded-full transition-colors duration-300 ${
        isDark
          ? 'bg-slate-100/10 border border-white/10'
          : 'bg-slate-900/8 border border-slate-900/10'
      } ${className}`}
    >
      {/* Thumb */}
      <span
        className={`absolute top-[2px] w-[15px] h-[15px] rounded-full flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isDark
            ? 'left-[19px] bg-slate-900 shadow-[0_1px_4px_rgba(0,0,0,0.5)]'
            : 'left-[2px] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.25)]'
        }`}
      >
        {isDark
          ? <MoonIcon size={9} className="text-slate-300" />
          : <SunIcon  size={9} className="text-amber-500" />
        }
      </span>
    </button>
  )
}
