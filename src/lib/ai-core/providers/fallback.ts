// Fallback Provider — Dernier recours si aucun provider ne répond
// PLUS DE MODE DÉMO — essaie tous les providers en cascade
import type { AIResponse } from '../types'

export async function queryFallback(message: string): Promise<AIResponse> {
  const start = Date.now()
  const errors: string[] = []

  // Essayer chaque provider activé en cascade
  const providerSlugs = ['gemini', 'mistral', 'openrouter', 'groq', 'huggingface', 'cloudflare', 'openai', 'deepseek']

  for (const slug of providerSlugs) {
    try {
      const { getProvider, recordProviderCall } = await import('./registry')
      const provider = await getProvider(slug)
      if (!provider || !provider.apiKey) {
        errors.push(`${slug}: non configuré`)
        continue
      }

      const result = await callProviderDirectly(provider, message)
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      errors.push(`${slug}: ${msg}`)
    }
  }

  // Si vraiment rien ne marche, retourner une erreur claire
  return {
    provider: 'fallback',
    content: `**⚠️ Tous les fournisseurs IA sont indisponibles.**\n\nDétails des erreurs :\n${errors.map(e => `- ${e}`).join('\n')}\n\nVérifiez la configuration des clés API dans le panneau d'administration.`,
    model: 'fallback-error',
    latency: Date.now() - start,
    isError: true,
  }
}

// Appel direct d'un provider sans passer par les fonctions spécifiques
async function callProviderDirectly(provider: { slug: string; baseUrl: string; apiKey: string; authPrefix: string; authHeader: string; defaultModel: string; apiType: string }, message: string): Promise<AIResponse> {
  const start = Date.now()
  const { recordProviderCall } = await import('./registry')

  try {
    let url: string
    let body: unknown

    if (provider.apiType === 'gemini') {
      url = `${provider.baseUrl}?key=${provider.apiKey}`
      body = {
        contents: [{ parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: 4096 },
      }
    } else {
      url = provider.baseUrl
      body = {
        model: provider.defaultModel,
        messages: [
          { role: 'system', content: 'Tu es un assistant IA intelligent. Réponds de façon structurée en Markdown.' },
          { role: 'user', content: message },
        ],
        max_tokens: 4096,
        temperature: 0.7,
      }
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (provider.apiType !== 'gemini') {
      headers[provider.authHeader || 'Authorization'] = `${provider.authPrefix}${provider.apiKey}`
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) {
      const err = await res.text().catch(() => 'Pas de détail')
      throw new Error(`HTTP ${res.status}: ${err.substring(0, 200)}`)
    }

    const data = await res.json()
    let content: string

    if (provider.apiType === 'gemini') {
      content = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Aucune réponse.'
    } else {
      // Support Workers AI (result.choices) et OpenAI-compatible (choices)
      const choices = data?.result?.choices || data?.choices || []
      content = choices[0]?.message?.content || choices[0]?.text || 'Aucune réponse.'
    }

    const latency = Date.now() - start
    await recordProviderCall(provider.slug, true, latency)

    return {
      provider: provider.slug,
      content,
      model: provider.defaultModel,
      latency,
    }
  } catch (error) {
    const latency = Date.now() - start
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    await recordProviderCall(provider.slug, false, latency, msg).catch(() => {})
    throw error
  }
}