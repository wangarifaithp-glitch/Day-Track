import { useRef, useState } from 'react'
import { Check, ImagePlus, LoaderCircle, Palette as PaletteIcon, Sun, Trash2 } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { getErrorMessage } from '../../services/apiClient'
import { useAppearance } from '../../layouts/AppLayout'
import type { Palette } from '../../layouts/AppLayout'

const PALETTE_OPTIONS: {
  id: Palette
  name: string
  description: string
  colors: [string, string, string]
}[] = [
  {
    id: 'forest',
    name: 'Forest',
    description: 'Soft neutrals with calm, grounded greens.',
    colors: ['#173a32', '#54806d', '#dbe8df'],
  },
  {
    id: 'flow',
    name: 'Flow',
    description: 'Fresh blues with bright, energetic accents.',
    colors: ['#365fe5', '#16a36a', '#ec6aa8'],
  },
  {
    id: 'warm',
    name: 'Warm',
    description: 'Sand-toned surfaces with a bold orange accent.',
    colors: ['#e86d2d', '#f4bd75', '#f5eddf'],
  },
]

const BACKGROUND_OPTIONS = [
  { name: 'Alpine Lake', src: '/wallpapers/alpine-lake.jpg' },
  { name: 'Cinque Terre', src: '/wallpapers/cinque-terre.jpg' },
  { name: 'Starlit Peaks', src: '/wallpapers/starry-peaks.jpg' },
  { name: 'Yosemite Valley', src: '/wallpapers/yosemite-river.jpg' },
  { name: 'Mountain Retreat', src: '/wallpapers/mountain-retreat.jpg' },
  { name: 'Turquoise Coast', src: '/wallpapers/turquoise-coast.jpg' },
  { name: 'Dubai Dunes', src: '/wallpapers/dubai-dunes.jpg' },
  { name: 'Lake Atitlan', src: '/wallpapers/lake-atitlan.jpg' },
  { name: 'Palm Horizon', src: '/wallpapers/palm-horizon.jpg' },
  { name: 'Pier at Dusk', src: '/wallpapers/pier-at-dusk.jpg' },
  { name: 'Forest Waterfall', src: '/wallpapers/forest-waterfall.jpg' },
  { name: 'Island Twilight', src: '/wallpapers/island-twilight.jpg' },
  { name: 'Mossy River', src: '/wallpapers/mossy-river.jpg' },
  { name: 'Forest Stream', src: '/wallpapers/forest-stream.jpg' },
  { name: 'Open Meadow', src: '/wallpapers/open-meadow.jpg' },
] as const

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('The image could not be prepared. Please choose another file.'))
    }, 'image/jpeg', quality)
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('The image could not be saved. Please try again.'))
    }
    reader.onerror = () => reject(new Error('The image could not be read. Please choose another file.'))
    reader.readAsDataURL(blob)
  })
}

async function prepareBackgroundImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file to use as your background.')
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('Choose an image smaller than 12 MB.')
  }

  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Your browser could not prepare this image.')
    context.fillStyle = '#f7f8f5'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    let blob = await canvasToBlob(canvas, 0.82)
    for (let quality = 0.72; blob.size > 1_500_000 && quality >= 0.42; quality -= 0.1) {
      blob = await canvasToBlob(canvas, quality)
    }
    if (blob.size > 1_500_000) {
      throw new Error('This image is still too large after resizing. Choose a smaller image.')
    }
    return await blobToDataUrl(blob)
  } finally {
    bitmap.close()
  }
}

export function SettingsPage() {
  const {
    theme,
    setTheme,
    palette,
    setPalette,
    backgroundImage,
    setBackgroundImage,
  } = useAppearance()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  async function uploadBackground(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      setBackgroundImage(await prepareBackgroundImage(file))
      setNotice('Your background image is saved in this browser.')
    } catch (uploadError) {
      setError(getErrorMessage(uploadError))
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  function clearBackground() {
    setError(null)
    setNotice(null)
    try {
      setBackgroundImage(null)
      setNotice('The background image has been removed.')
    } catch (storageError) {
      setError(getErrorMessage(storageError))
    }
  }

  function chooseBackground(image: string, name: string) {
    setError(null)
    setNotice(null)
    try {
      setBackgroundImage(image)
      setNotice(`${name} wallpaper selected.`)
    } catch (storageError) {
      setError(getErrorMessage(storageError))
    }
  }

  function choosePalette(nextPalette: Palette) {
    setError(null)
    setNotice(null)
    try {
      setPalette(nextPalette)
      setNotice('Your color palette has been applied throughout DAYTRACK.')
    } catch (storageError) {
      setError(getErrorMessage(storageError))
    }
  }

  function chooseTheme(nextTheme: 'light' | 'dark') {
    setError(null)
    try {
      setTheme(nextTheme)
    } catch (storageError) {
      setError(getErrorMessage(storageError))
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-slate-400">Make your space feel like yours</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-[28px]">Appearance</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
          Choose a color mood and an optional background image. Your choices apply across every page on this device.
        </p>
      </header>

      {error && (
        <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}
      {notice && <p role="status" className="text-sm font-medium text-emerald-800">{notice}</p>}

      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eef4ef] text-[#54806d]">
            <PaletteIcon size={19} />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">Color palette</h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">
              Pick a palette for buttons, highlights, and page surfaces.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {PALETTE_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.id}
              aria-pressed={palette === option.id}
              onClick={() => choosePalette(option.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                palette === option.id
                  ? 'border-[#54806d] bg-[#f3f7f4] ring-2 ring-[#54806d]/15'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-900">{option.name}</span>
                {palette === option.id && (
                  <span className="grid size-6 place-items-center rounded-full bg-[#173a32] text-white">
                    <Check size={14} />
                  </span>
                )}
              </span>
              <span className="mt-3 flex gap-2" aria-label={`${option.name} palette preview`}>
                {option.colors.map((color) => (
                  <span
                    key={color}
                    className="size-7 rounded-full border border-black/5"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
              <span className="mt-3 block text-sm leading-5 text-slate-500">{option.description}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eef4ef] text-[#54806d]">
              <Sun size={19} />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">Light or dark</h2>
              <p className="mt-1 text-sm leading-5 text-slate-500">Choose the overall brightness of your workspace.</p>
            </div>
          </div>
          <div className="flex w-full rounded-xl border border-slate-200 bg-white p-1 md:w-auto">
            {(['light', 'dark'] as const).map((option) => (
              <button
                type="button"
                key={option}
                aria-pressed={theme === option}
                onClick={() => chooseTheme(option)}
                className={`h-9 flex-1 rounded-lg px-4 text-sm font-semibold capitalize transition md:flex-none ${
                  theme === option ? 'bg-[#e8f0ec] text-[#173a32]' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eef4ef] text-[#54806d]">
              <ImagePlus size={19} />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">Choose a wallpaper</h2>
              <p className="mt-1 text-sm leading-5 text-slate-500">
                Browse all {BACKGROUND_OPTIONS.length} photos or add your own. Your selection appears across DAYTRACK.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {BACKGROUND_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.src}
                aria-label={`Use ${option.name} wallpaper`}
                aria-pressed={backgroundImage === option.src}
                onClick={() => chooseBackground(option.src, option.name)}
                className={`group overflow-hidden rounded-2xl border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#54806d] focus-visible:ring-offset-2 ${
                  backgroundImage === option.src
                    ? 'border-[#54806d] ring-2 ring-[#54806d]/20'
                    : 'border-slate-200 hover:border-slate-400'
                }`}
              >
                <span className="relative block aspect-[16/9] overflow-hidden bg-slate-100">
                  <img
                    src={option.src}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  {backgroundImage === option.src && (
                    <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-[#173a32] text-white shadow">
                      <Check size={14} />
                    </span>
                  )}
                </span>
                <span className="block px-3 py-2.5 text-sm font-medium text-slate-800">{option.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(240px,0.8fr)]">
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eef4ef] text-[#54806d]">
                <ImagePlus size={19} />
              </span>
              <div>
                <h2 className="font-semibold text-slate-900">Upload your own</h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Use a photo or illustration from your device instead of a gallery wallpaper.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={busy}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#173a32] px-4 text-sm font-semibold text-white transition hover:bg-[#245445] disabled:opacity-60"
              >
                {busy ? <LoaderCircle size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                {busy ? 'Preparing image…' : backgroundImage ? 'Choose another image' : 'Choose an image'}
              </button>
              {backgroundImage && (
                <button
                  type="button"
                  onClick={clearBackground}
                  disabled={busy}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <Trash2 size={15} />
                  Remove image
                </button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="sr-only"
                aria-label="Choose a background image"
                onChange={(event) => void uploadBackground(event.currentTarget.files?.[0])}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              Gallery wallpapers are included with DAYTRACK. Your uploads are resized and saved in this browser; they are not uploaded. Maximum original file size: 12 MB.
            </p>
          </div>

          <div className="border-t border-slate-100 p-4 md:border-l md:border-t-0">
            <div
              role="img"
              aria-label={backgroundImage ? 'Selected background image preview' : 'No background image selected'}
              className={`grid min-h-44 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-[#f7f8f5] bg-cover bg-center p-4 text-center ${
                backgroundImage ? 'text-slate-900' : 'text-slate-400'
              }`}
              style={backgroundImage ? {
                backgroundImage: `linear-gradient(rgb(255 255 255 / 30%), rgb(255 255 255 / 30%)), url("${backgroundImage}")`,
              } : undefined}
            >
              {!backgroundImage && (
                <span>
                  <ImagePlus size={24} className="mx-auto mb-2" />
                  <span className="text-sm">Your image preview will appear here</span>
                </span>
              )}
              {backgroundImage && (
                <span className="rounded-xl bg-white/80 px-3 py-2 text-sm font-semibold shadow-sm backdrop-blur">
                  DAYTRACK preview
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
