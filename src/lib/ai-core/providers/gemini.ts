// Fournisseur Gemini — Utilise le Provider Registry
import type { AIResponse } from '../types'
import { getProvider, recordProviderCall } from './registry'

export async function queryGemini(message: string, systemPrompt?: string): Promise<AIResponse> {
  const start = Date.now()
  try {
    const provider = await getProvider('gemini')
    if (!provider) throw new Error('Gemini non configuré')

    const url = `${provider.baseUrl}?key=${provider.apiKey}`

    const contents = []
    if (systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: systemPrompt }] })
      contents.push({ role: 'model', parts: [{ text: 'Compris.' }] })
    }
    contents.push({ parts: [{ text: message }] })

    const body = {
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      const msg = `Gemini API error ${res.status}: ${err}`
      await recordProviderCall('gemini', false, Date.now() - start, msg)
      throw new Error(msg)
    }

    const data = await res.json()
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Aucune réponse générée.'
    const latency = Date.now() - start
    await recordProviderCall('gemini', true, latency)

    return { provider: 'gemini', content, model: provider.defaultModel, latency }
  } catch (error) {
    const latency = Date.now() - start
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    if (!msg.includes('Gemini API error')) {
      await recordProviderCall('gemini', false, latency, msg)
    }
    return { provider: 'gemini', content: `[Erreur Gemini] ${msg}`, model: 'gemini', latency }
  }
}