'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { EagleIcon, HomeIcon, GridIcon, SearchIcon, BookmarkIcon } from './Icons'

const TABS = [
  { href: '/',          label: 'Dashboard', Icon: HomeIcon     },
  { href: '/heatmap',   label: 'Heatmap',   Icon: GridIcon     },
  { href: '/screener',  label: 'Screener',  Icon: SearchIcon   },
  { href: '/watchlist', label: 'Watchlist', Icon: BookmarkIcon },
]

export default function Nav() {
  const path = usePathname()
  return (
    <>
      <nav className="hidden sm:flex items-center gap-1 px-6 py-3 bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <Link href="/" className="flex items-center gap-2 mr-6 text-slate-800">
          <EagleIcon size={22} />
          <span className="font-bold tracking-tight text-base">Eagleview</span>
        </Link>
        {TABS.map(({ href, label, Icon }) => {
          const active = path === href
          return (
            <Link key={href} href={href} className={`nav-item flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold ${active ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}>
              <Icon size={14} />
              {label}
            </Link>
          )
        })}
      </nav>
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 flex">
        {TABS.map(({ href, label, Icon }) => {
          const active = path === href
          return (
            <Link key={href} href={href} className={`nav-item relative flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold tracking-wide ${active ? 'text-slate-900' : 'text-slate-400'}`}>
              <Icon size={18} />
              <span>{label}</span>
              {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-slate-900 rounded-full" />}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
