'use client'

import { useState, useEffect } from 'react'
import { EagleIcon, CloseIcon, ShareIcon, PlusSquareIcon } from './Icons'

const DISMISS_KEY     = 'eagleview-install-dismissed-at'
const DISMISS_DAYS    = 14
const SHOW_DELAY_MS   = 1800

type Platform = 'ios' | 'android' | 'other'

/** Minimal shape of the BeforeInstallPromptEvent (not yet in lib.dom.d.ts) */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function detectPlatform(): Platform {
  const ua = window.navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'other'
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari exposes this non-standard property
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isMobile(): boolean {
  return /iphone|ipad|ipod|android/i.test(window.navigator.userAgent)
}

export default function InstallPrompt() {
  const [visible, setVisible]   = useState(false)
  const [platform, setPlatform] = useState<Platform>('other')
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (!isMobile() || isStandalone()) return

    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / 86_400_000
      if (daysSince < DISMISS_DAYS) return
    }

    setPlatform(detectPlatform())

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS)

    const onInstalled = () => setVisible(false)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
      clearTimeout(timer)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  const handleInstall = async () => {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') setVisible(false)
    else dismiss()
  }

  if (!visible) return null

  return (
    <div
      className="install-banner fixed bottom-[76px] sm:bottom-5 inset-x-3 sm:inset-x-auto sm:right-5 sm:w-80 z-40"
      role="dialog"
      aria-label="Install Eagleview"
    >
      <div className="modal-sheet rounded-[20px] p-4 flex items-start gap-3">
        <div className="shrink-0 p-2 rounded-[14px] bg-gradient-to-br from-slate-100 to-slate-200 border border-white/80 shadow-sm">
          <EagleIcon size={20} className="text-slate-800" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-slate-800 mb-0.5">Install Eagleview</p>

          {platform === 'ios' ? (
            <p className="text-[11px] text-slate-500 leading-snug">
              Tap <ShareIcon size={11} className="inline -mt-0.5 mx-0.5 text-slate-400" />
              then <span className="font-semibold text-slate-600">Add to Home Screen</span>
              <PlusSquareIcon size={11} className="inline -mt-0.5 mx-0.5 text-slate-400" />
              for a faster, full-screen experience.
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 leading-snug">
              Add to your home screen for a faster, full-screen experience — no app store needed.
            </p>
          )}

          {platform !== 'ios' && deferred && (
            <button
              onClick={handleInstall}
              className="mt-2.5 px-3.5 py-1.5 rounded-[10px] bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-700 transition-colors"
            >
              Install
            </button>
          )}
        </div>

        <button
          onClick={dismiss}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Dismiss"
        >
          <CloseIcon size={13} />
        </button>
      </div>
    </div>
  )
}
