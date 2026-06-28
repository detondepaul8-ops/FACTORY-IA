// Fournisseur Mistral — Utilise le Provider Registry
import type { AIResponse } from '../types'
import { getProvider, recordProviderCall } from './registry'

export async function queryMistral(message: string, _systemPrompt?: string): Promise<AIResponse> {
  const start = Date.now()
  try {
    const provider = await getProvider('mistral')
    if (!provider) throw new Error('Mistral non configuré')

    const body = {
      model: provider.defaultModel,
      messages: [
        { role: 'system', content: 'Tu es un assistant IA intelligent et polyvalent. Réponds de façon claire et structurée en utilisant le Markdown.' },
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
      const msg = `Mistral API error ${res.status}: ${err}`
      await recordProviderCall('mistral', false, Date.now() - start, msg)
      throw new Error(msg)
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content || 'Aucune réponse générée.'
    const latency = Date.now() - start
    await recordProviderCall('mistral', true, latency)

    return { provider: 'mistral', content, model: provider.defaultModel, latency }
  } catch (error) {
    const latency = Date.now() - start
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    if (!msg.includes('Mistral API error')) {
      await recordProviderCall('mistral', false, latency, msg)
    }
    return { provider: 'mistral', content: `[Erreur Mistral] ${msg}`, model: 'mistral', latency }
  }
}