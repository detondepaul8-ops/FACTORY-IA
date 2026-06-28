// Fournisseur Groq — Utilise le Provider Registry
import type { AIResponse } from '../types'
import { getProvider, recordProviderCall } from './registry'

export async function queryGroq(message: string, _systemPrompt?: string): Promise<AIResponse> {
  const start = Date.now()
  try {
    const provider = await getProvider('groq')
    if (!provider) throw new Error('Groq non configuré')

    const body = {
      model: provider.defaultModel,
      messages: [
        { role: 'system', content: 'Tu es un assistant IA intelligent. Réponds de façon structurée en Markdown.' },
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
      const msg = `Groq API error ${res.status}: ${err}`
      await recordProviderCall('groq', false, Date.now() - start, msg)
      throw new Error(msg)
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content || 'Aucune réponse générée.'
    const latency = Date.now() - start
    await recordProviderCall('groq', true, latency)

    return { provider: 'groq', content, model: provider.defaultModel, latency }
  } catch (error) {
    const latency = Date.now() - start
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    if (!msg.includes('Groq API error')) {
      await recordProviderCall('groq', false, latency, msg)
    }
    return { provider: 'groq', content: `[Erreur Groq] ${msg}`, model: 'groq', latency }
  }
}