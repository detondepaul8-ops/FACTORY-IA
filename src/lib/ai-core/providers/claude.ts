// Fournisseur Claude — Utilise le Provider Registry
import type { AIResponse } from '../types'
import { getProvider, recordProviderCall } from './registry'

export async function queryClaude(message: string, _systemPrompt?: string): Promise<AIResponse> {
  const start = Date.now()
  try {
    const provider = await getProvider('claude')
    if (!provider) throw new Error('Claude non configuré')

    const body: Record<string, unknown> = {
      model: provider.defaultModel,
      max_tokens: 4096,
      messages: [{ role: 'user', content: message }],
    }

    const res = await fetch(provider.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      const msg = `Claude API error ${res.status}: ${err}`
      await recordProviderCall('claude', false, Date.now() - start, msg)
      throw new Error(msg)
    }

    const data = await res.json()
    const content = data?.content?.[0]?.text || 'Aucune réponse générée.'
    const latency = Date.now() - start
    await recordProviderCall('claude', true, latency)

    return { provider: 'claude', content, model: provider.defaultModel, latency }
  } catch (error) {
    const latency = Date.now() - start
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    if (!msg.includes('Claude API error')) {
      await recordProviderCall('claude', false, latency, msg)
    }
    return { provider: 'claude', content: `[Erreur Claude] ${msg}`, model: 'claude', latency }
  }
}