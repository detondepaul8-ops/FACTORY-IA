// Fournisseur OpenRouter — Agrégateur multi-modèles
import type { AIResponse } from '../types'
import { getProvider, recordProviderCall } from './registry'

export async function queryOpenRouter(message: string, _systemPrompt?: string): Promise<AIResponse> {
  const start = Date.now()
  try {
    const provider = await getProvider('openrouter')
    if (!provider) throw new Error('OpenRouter non configuré')

    const body = {
      model: provider.defaultModel,
      messages: [
        { role: 'system', content: 'Tu es un assistant IA intelligent via OpenRouter. Réponds en Markdown.' },
        { role: 'user', content: message },
      ],
      max_tokens: 4096,
      temperature: 0.7,
    }

    const res = await fetch(provider.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `${provider.authPrefix}${provider.apiKey}`,
        'HTTP-Referer': 'https://factory-ia.app',
        'X-Title': 'FACTORY IA',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      const msg = `OpenRouter API error ${res.status}: ${err}`
      await recordProviderCall('openrouter', false, Date.now() - start, msg)
      throw new Error(msg)
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content || 'Aucune réponse générée.'
    const latency = Date.now() - start
    await recordProviderCall('openrouter', true, latency)

    return { provider: 'openrouter' as AIResponse['provider'], content, model: provider.defaultModel, latency }
  } catch (error) {
    const latency = Date.now() - start
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    if (!msg.includes('OpenRouter API error')) {
      await recordProviderCall('openrouter', false, latency, msg)
    }
    return { provider: 'openrouter' as AIResponse['provider'], content: `[Erreur OpenRouter] ${msg}`, model: 'openrouter', latency }
  }
}