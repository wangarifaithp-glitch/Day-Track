import { useRef, useState } from 'react'
import { Camera, ImagePlus, Save, Trash2, UserRound } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { useAppearance } from '../../layouts/AppLayout'
import { getErrorMessage } from '../../services/apiClient'

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('The photo could not be prepared. Please choose another image.'))
    }, 'image/jpeg', quality)
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('The photo could not be saved. Please try again.'))
    }
    reader.onerror = () => reject(new Error('The photo could not be read. Please choose another file.'))
    reader.readAsDataURL(blob)
  })
}

async function prepareProfilePhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file for your profile photo.')
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('Choose a photo smaller than 12 MB.')
  }

  const bitmap = await createImageBitmap(file)
  try {
    if (bitmap.width * bitmap.height > 40_000_000) {
      throw new Error('This image is too large to process. Choose a smaller image.')
    }
    const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Your browser could not prepare this photo.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    let blob = await canvasToBlob(canvas, 0.82)
    for (let quality = 0.72; blob.size > 500_000 && quality >= 0.42; quality -= 0.1) {
      blob = await canvasToBlob(canvas, quality)
    }
    if (blob.size > 500_000) {
      throw new Error('This photo is still too large after resizing. Choose another image.')
    }
    return await blobToDataUrl(blob)
  } finally {
    bitmap.close()
  }
}

export function ProfilePage() {
  const { profile, setProfile } = useAppearance()
  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  async function uploadPhoto(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const photo = await prepareProfilePhoto(file)
      setProfile({ ...profile, photo })
      setNotice('Your profile photo is saved in this browser.')
    } catch (uploadError) {
      setError(getErrorMessage(uploadError))
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  function removePhoto() {
    setError(null)
    setNotice(null)
    try {
      setProfile({ ...profile, photo: null })
      setNotice('Your profile photo has been removed.')
    } catch (storageError) {
      setError(getErrorMessage(storageError))
    }
  }

  function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    try {
      setProfile({ ...profile, name: name.trim(), email: email.trim() })
      setNotice('Your profile has been saved in this browser.')
    } catch (storageError) {
      setError(getErrorMessage(storageError))
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-slate-400">Your space, your way</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-[28px]">Your profile</h1>
        <p className="mt-1 text-sm text-slate-500">Add a photo and update the details shown in your profile.</p>
      </header>

      {error && (
        <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}
      {notice && <p role="status" className="text-sm font-medium text-emerald-800">{notice}</p>}

      <Card className="p-5 sm:p-7">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-full bg-[#e8f0ec] text-[#54806d] ring-4 ring-[#e8f0ec]/60">
            {profile.photo ? (
              <img src={profile.photo} alt="Your profile" className="size-full object-cover" />
            ) : (
              <UserRound size={38} strokeWidth={1.5} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-900">Profile photo</h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">
              Choose an image from your device. We resize it and save it locally in this browser.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                aria-label="Choose a profile photo"
                className="sr-only"
                onChange={(event) => void uploadPhoto(event.target.files?.[0])}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#173a32] px-3.5 text-sm font-semibold text-white transition hover:bg-[#1d473d] disabled:cursor-wait disabled:opacity-60"
              >
                {busy ? <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Camera size={16} />}
                {busy ? 'Preparing photo…' : 'Choose photo'}
              </button>
              {profile.photo && (
                <button
                  type="button"
                  onClick={removePhoto}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <Trash2 size={15} />
                  Remove
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-400">Image files only · up to 12 MB</p>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-7">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#eef4ef] text-[#54806d]">
            <ImagePlus size={19} />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">Personal details</h2>
            <p className="mt-0.5 text-sm text-slate-500">These details are stored on this device.</p>
          </div>
        </div>

        <form className="max-w-xl space-y-4" onSubmit={saveProfile}>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Name</span>
            <input
              required
              maxLength={80}
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Email address</span>
            <input
              type="email"
              maxLength={254}
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#173a32] px-4 text-sm font-semibold text-white transition hover:bg-[#1d473d]"
          >
            <Save size={16} />
            Save profile
          </button>
        </form>
      </Card>
    </div>
  )
}
