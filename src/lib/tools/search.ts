// Tool Engine — Recherche web (Google + YouTube)
// Utilise z-ai-web-dev-sdk pour la recherche web

import type { WebSource } from '../ai-core/types'

export async function searchGoogle(query: string): Promise<WebSource[]> {
  const sources: WebSource[] = []

  try {
    // Utiliser z-ai-web-dev-sdk pour la recherche web
    const { createWebSearch } = await import('z-ai-web-dev-sdk')
    const search = createWebSearch()

    const results = await search.search(query)

    if (results && Array.isArray(results)) {
      for (const result of results.slice(0, 5)) {
        const r = result as Record<string, unknown>
        sources.push({
          title: String(r.title || r.name || 'Sans titre'),
          url: String(r.url || r.link || r.href || '#'),
          snippet: String(r.snippet || r.description || r.text || ''),
          source: 'google',
        })
      }
    }
  } catch {
    // Si le SDK échoue, essayer avec fetch direct vers Google Custom Search
    const apiKey = process.env.GOOGLE_API_KEY
    const cx = process.env.GOOGLE_CX

    if (apiKey && cx) {
      try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=5`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          for (const item of (data.items || []).slice(0, 5)) {
            sources.push({
              title: item.title,
              url: item.link,
              snippet: item.snippet,
              source: 'google',
            })
          }
        }
      } catch {
        // Google Search API échouée
      }
    }
  }

  return sources
}

export async function searchYouTube(query: string): Promise<WebSource[]> {
  const sources: WebSource[] = []

  try {
    const apiKey = process.env.YOUTUBE_API_KEY

    if (apiKey) {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=3&q=${encodeURIComponent(query)}&key=${apiKey}`
      const res = await fetch(url)

      if (res.ok) {
        const data = await res.json()
        for (const item of (data.items || []).slice(0, 3)) {
          sources.push({
            title: item.snippet.title,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            snippet: item.snippet.description?.substring(0, 200) || '',
            source: 'youtube',
          })
        }
      }
    }
  } catch {
    // YouTube API échouée
  }

  return sources
}

// Recherche combinée Google + YouTube
export async function searchAll(query: string): Promise<WebSource[]> {
  const [google, youtube] = await Promise.allSettled([
    searchGoogle(query),
    searchYouTube(query),
  ])

  const sources: WebSource[] = []
  if (google.status === 'fulfilled') sources.push(...google.value)
  if (youtube.status === 'fulfilled') sources.push(...youtube.value)

  return sources
}