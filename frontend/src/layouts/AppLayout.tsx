import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '../components/navigation/Header'

type Theme = 'light' | 'dark'
export type Palette = 'forest' | 'flow' | 'warm'

export type UserProfile = {
  name: string
  email: string
  photo: string | null
}

type AppearanceSettings = {
  theme: Theme
  setTheme: (theme: Theme) => void
  palette: Palette
  setPalette: (palette: Palette) => void
  backgroundImage: string | null
  setBackgroundImage: (image: string | null) => void
  profile: UserProfile
  setProfile: (profile: UserProfile) => void
}

const AppearanceContext = createContext<AppearanceSettings | null>(null)
const DEFAULT_PROFILE: UserProfile = { name: '', email: '', photo: null }

function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== 'object') return false
  const profile = value as Record<string, unknown>
  return (
    typeof profile.name === 'string' &&
    typeof profile.email === 'string' &&
    (typeof profile.photo === 'string' || profile.photo === null)
  )
}

function getStoredProfile(): UserProfile {
  const storedProfile = window.localStorage.getItem('daywise-user-profile')
  if (!storedProfile) return DEFAULT_PROFILE

  const parsedProfile: unknown = JSON.parse(storedProfile)
  return isUserProfile(parsedProfile) ? parsedProfile : DEFAULT_PROFILE
}

const LEGACY_WALLPAPERS: Record<string, string> = {
  '/wallpapers/quiet-forest.svg': '/wallpapers/alpine-lake.jpg',
  '/wallpapers/ocean-dusk.svg': '/wallpapers/turquoise-coast.jpg',
  '/wallpapers/golden-hour.svg': '/wallpapers/cinque-terre.jpg',
  '/wallpapers/misty-mountains.svg': '/wallpapers/yosemite-river.jpg',
  '/wallpapers/botanical.svg': '/wallpapers/mountain-retreat.jpg',
  '/wallpapers/night-sky.svg': '/wallpapers/starry-peaks.jpg',
  '/wallpapers/desert-dunes.svg': '/wallpapers/dubai-dunes.jpg',
}

function isPalette(value: string | null): value is Palette {
  return value === 'forest' || value === 'flow' || value === 'warm'
}

function getStoredBackgroundImage(): string | null {
  const savedImage = window.localStorage.getItem('daywise-background-image')
  const replacement = savedImage ? LEGACY_WALLPAPERS[savedImage] : undefined
  if (!replacement) return savedImage

  window.localStorage.setItem('daywise-background-image', replacement)
  return replacement
}

export function useAppearance(): AppearanceSettings {
  const appearance = useContext(AppearanceContext)
  if (!appearance) throw new Error('useAppearance must be used inside the application layout.')
  return appearance
}

export function AppLayout() {
  const [theme, setThemeState] = useState<Theme>(() =>
    window.localStorage.getItem('daywise-theme') === 'dark' ? 'dark' : 'light',
  )
  const [palette, setPaletteState] = useState<Palette>(() => {
    const storedPalette = window.localStorage.getItem('daywise-palette')
    return isPalette(storedPalette) ? storedPalette : 'forest'
  })
  const [backgroundImage, setBackgroundImageState] = useState<string | null>(() =>
    getStoredBackgroundImage(),
  )
  const [profile, setProfileState] = useState<UserProfile>(() => getStoredProfile())

  const setTheme = useCallback((nextTheme: Theme) => {
    window.localStorage.setItem('daywise-theme', nextTheme)
    setThemeState(nextTheme)
  }, [])

  const setPalette = useCallback((nextPalette: Palette) => {
    window.localStorage.setItem('daywise-palette', nextPalette)
    setPaletteState(nextPalette)
  }, [])

  const setBackgroundImage = useCallback((image: string | null) => {
    if (image) {
      window.localStorage.setItem('daywise-background-image', image)
    } else {
      window.localStorage.removeItem('daywise-background-image')
    }
    setBackgroundImageState(image)
  }, [])

  const setProfile = useCallback((nextProfile: UserProfile) => {
    window.localStorage.setItem('daywise-user-profile', JSON.stringify(nextProfile))
    setProfileState(nextProfile)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.dataset.palette = palette
    root.dataset.wallpaper = backgroundImage ? 'true' : 'false'
    root.style.setProperty(
      '--app-wallpaper',
      backgroundImage ? `url("${backgroundImage}")` : 'none',
    )
  }, [backgroundImage, palette, theme])

  return (
    <AppearanceContext.Provider
      value={{
        theme,
        setTheme,
        palette,
        setPalette,
        backgroundImage,
        setBackgroundImage,
        profile,
        setProfile,
      }}
    >
      <div
        data-theme={theme}
        data-palette={palette}
        className="relative z-[1] min-h-screen bg-transparent text-slate-900"
      >
        <Header
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        />
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </AppearanceContext.Provider>
  )
}
