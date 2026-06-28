// Fournisseur Groq — Vitesse + Optimisation
import type { AIResponse } from '../types'

export async function queryGroq(message: string, _systemPrompt?: string): Promise<AIResponse> {
  const start = Date.now()
  try {
    const apiKey = process.env.GROQ_API_KEY || ''
    const url = 'https://api.groq.com/openai/v1/chat/completions'

    const body = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Tu es un assistant IA intelligent. Réponds de façon structurée en Markdown.' },
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
      throw new Error(`Groq API error ${res.status}: ${err}`)
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content || 'Aucune réponse générée.'

    return {
      provider: 'groq',
      content,
      model: 'llama-3.3-70b-versatile',
      latency: Date.now() - start,
    }
  } catch (error) {
    return {
      provider: 'groq',
      content: `[Erreur Groq] ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      model: 'llama-3.3-70b-versatile',
      latency: Date.now() - start,
    }
  }
}