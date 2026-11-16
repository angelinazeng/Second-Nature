import { ScanKey } from '../data/catalog'

export type GuideEntry = {
  key: ScanKey
  tip: string
  savedAt: number
  source: 'scan' | 'community' | 'shared'
}

export type SharedGuide = {
  id: string
  household: string
  city: string
  note: string
  items: { key: ScanKey; tip: string }[]
  updated_at: number
}

export type Reply = { id: number; author: string; text: string; created_at: number }

export type Story = {
  id: number
  kind: 'story' | 'tip'
  author: string
  role: string
  city: string
  caption: string
  item_key: ScanKey | null
  photo: string | null
  helpful: number
  created_at: number
  guide: { id: string; household: string; city: string; count: number } | null
  replies: Reply[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  if (!response.ok) throw new Error(`${path} failed with ${response.status}`)
  return response.json()
}

export function publishGuide(guide: { id?: string; household: string; city: string; note: string; entries: GuideEntry[] }) {
  return request<SharedGuide>('/api/guides', {
    method: 'POST',
    body: JSON.stringify({
      id: guide.id,
      household: guide.household,
      city: guide.city,
      note: guide.note,
      items: guide.entries.map(({ key, tip }) => ({ key, tip })),
    }),
  })
}

export const fetchGuide = (id: string) => request<SharedGuide>(`/api/guides/${encodeURIComponent(id)}`)

export const fetchStories = () => request<Story[]>('/api/stories')

export function postStory(story: {
  kind: Story['kind']
  author: string
  city: string
  caption: string
  item_key?: ScanKey
  guide_id?: string
  photo?: string
}) {
  return request<Story>('/api/stories', { method: 'POST', body: JSON.stringify(story) })
}

export const markHelpful = (id: number, delta: 1 | -1) =>
  request<Story>(`/api/stories/${id}/helpful`, { method: 'POST', body: JSON.stringify({ delta }) })

export const postReply = (id: number, author: string, text: string) =>
  request<Story>(`/api/stories/${id}/replies`, { method: 'POST', body: JSON.stringify({ author, text }) })

export function guideLink(id: string) {
  return `${window.location.origin}${window.location.pathname}?guide=${encodeURIComponent(id)}`
}

/** Shrink a photo to a JPEG data URL small enough to store with a story. */
export async function photoToDataUrl(file: File, maxSide = 900): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.8)
}

export function timeAgo(seconds: number) {
  const minutes = Math.max(0, Math.round((Date.now() / 1000 - seconds) / 60))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}

export function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}
