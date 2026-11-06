import {useEffect, useState} from 'react'

// Per-device setting: only the PC wired to the kitchen printer turns this on.
// The tablet used to manage orders keeps it off, so it never prints.
const STORAGE_KEY = 'pascuala_kitchen_printer'
const CHANGE_EVENT = 'pascuala-kitchen-printer-change'

export interface KitchenPrinterSettings {
  enabled: boolean
  // Only orders created after this moment print automatically, so turning the
  // printer on doesn't dump the whole order history onto paper.
  enabledSince: string | null
}

const DISABLED: KitchenPrinterSettings = {enabled: false, enabledSince: null}

export function readKitchenPrinterSettings(): KitchenPrinterSettings {
  if (typeof window === 'undefined') {
    return DISABLED
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DISABLED
    const parsed = JSON.parse(raw) as Partial<KitchenPrinterSettings>
    if (parsed.enabled !== true || typeof parsed.enabledSince !== 'string') return DISABLED
    return {enabled: true, enabledSince: parsed.enabledSince}
  } catch (error) {
    console.error('Error loading kitchen printer settings', error)
    return DISABLED
  }
}

export function setKitchenPrinterEnabled(enabled: boolean) {
  if (typeof window === 'undefined') {
    return
  }

  if (enabled) {
    const settings: KitchenPrinterSettings = {enabled: true, enabledSince: new Date().toISOString()}
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } else {
    window.localStorage.removeItem(STORAGE_KEY)
  }

  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function useKitchenPrinterSettings(): KitchenPrinterSettings {
  const [settings, setSettings] = useState<KitchenPrinterSettings>(readKitchenPrinterSettings)

  useEffect(() => {
    const refresh = () => setSettings(readKitchenPrinterSettings())
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) refresh()
    }

    window.addEventListener(CHANGE_EVENT, refresh)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return settings
}
