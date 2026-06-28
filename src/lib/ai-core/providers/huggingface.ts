// Fournisseur HuggingFace — Modèles open source (gratuit)
import type { AIResponse } from '../types'
import { getProvider, recordProviderCall } from './registry'

export async function queryHuggingFace(message: string, _systemPrompt?: string): Promise<AIResponse> {
  const start = Date.now()
  try {
    const provider = await getProvider('huggingface')
    if (!provider) throw new Error('HuggingFace non configuré')

    // HuggingFace Inference API (OpenAI-compatible)
    const body = {
      model: provider.defaultModel,
      messages: [
        { role: 'system', content: 'Tu es un assistant IA intelligent. Réponds en Markdown.' },
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
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      const msg = `HuggingFace API error ${res.status}: ${err}`
      await recordProviderCall('huggingface', false, Date.now() - start, msg)
      throw new Error(msg)
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content || 'Aucune réponse générée.'
    const latency = Date.now() - start
    await recordProviderCall('huggingface', true, latency)

    return { provider: 'huggingface' as AIResponse['provider'], content, model: provider.defaultModel, latency }
  } catch (error) {
    const latency = Date.now() - start
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    if (!msg.includes('HuggingFace API error')) {
      await recordProviderCall('huggingface', false, latency, msg)
    }
    return { provider: 'huggingface' as AIResponse['provider'], content: `[Erreur HuggingFace] ${msg}`, model: 'huggingface', latency }
  }
}