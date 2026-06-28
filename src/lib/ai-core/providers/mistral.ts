// Fournisseur Mistral — Rapide + Français
import type { AIResponse } from '../types'

export async function queryMistral(message: string, _systemPrompt?: string): Promise<AIResponse> {
  const start = Date.now()
  try {
    const apiKey = process.env.MISTRAL_API_KEY || ''
    const url = 'https://api.mistral.ai/v1/chat/completions'

    const body = {
      model: 'mistral-large-latest',
      messages: [
        { role: 'system', content: 'Tu es un assistant IA intelligent et polyvalent. Réponds de façon claire et structurée en utilisant le Markdown.' },
        { role: 'user', content: message },
      ],
      max_tokens: 4096,
      temperature: 0.7,
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Mistral API error ${res.status}: ${err}`)
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content || 'Aucune réponse générée.'

    return {
      provider: 'mistral',
      content,
      model: 'mistral-large-latest',
      latency: Date.now() - start,
    }
  } catch (error) {
    return {
      provider: 'mistral',
      content: `[Erreur Mistral] ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      model: 'mistral-large-latest',
      latency: Date.now() - start,
    }
  }
}