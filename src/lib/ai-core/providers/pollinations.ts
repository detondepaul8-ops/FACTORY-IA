// Fournisseur Pollinations AI — Gratuit, sans clé API
import type { AIResponse } from '../types'
import { getProvider, recordProviderCall } from './registry'

export async function queryPollinations(message: string, _systemPrompt?: string): Promise<AIResponse> {
  const start = Date.now()
  try {
    const provider = await getProvider('pollinations')
    if (!provider) throw new Error('Pollinations non configuré')

    const body = {
      model: provider.defaultModel,
      messages: [
        { role: 'system', content: 'Tu es un assistant IA intelligent. Réponds de façon structurée en Markdown.' },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
    }

    const res = await fetch(provider.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Pollinations API error ${res.status}: ${err}`)
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content || 'Aucune réponse générée.'
    const latency = Date.now() - start
    await recordProviderCall('pollinations', true, latency)

    return { provider: 'pollinations', content, model: provider.defaultModel, latency }
  } catch (error) {
    const latency = Date.now() - start
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    await recordProviderCall('pollinations', false, latency, msg).catch(() => {})
    throw new Error(msg) // Propager l'erreur pour que l'engine la gère
  }
}