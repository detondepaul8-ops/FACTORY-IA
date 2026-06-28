// Fournisseur Gemini — Général + Raisonnement
import type { AIResponse } from '../types'

export async function queryGemini(message: string, _systemPrompt?: string): Promise<AIResponse> {
  const start = Date.now()
  try {
    const apiKey = process.env.GEMINI_API_KEY || ''
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

    const body = {
      contents: [{
        parts: [{ text: message }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Gemini API error ${res.status}: ${err}`)
    }

    const data = await res.json()
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Aucune réponse générée.'

    return {
      provider: 'gemini',
      content,
      model: 'gemini-2.5-flash',
      latency: Date.now() - start,
    }
  } catch (error) {
    return {
      provider: 'gemini',
      content: `[Erreur Gemini] ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      model: 'gemini-2.5-flash',
      latency: Date.now() - start,
    }
  }
}