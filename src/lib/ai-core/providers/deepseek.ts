// Fournisseur DeepSeek — Code + Logique
import type { AIResponse } from '../types'

export async function queryDeepSeek(message: string, _systemPrompt?: string): Promise<AIResponse> {
  const start = Date.now()
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY || ''
    const url = 'https://api.deepseek.com/chat/completions'

    const body = {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'Tu es un assistant IA intelligent. Réponds de façon claire, structurée et précise. Utilise le Markdown pour formater ta réponse.' },
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
      throw new Error(`DeepSeek API error ${res.status}: ${err}`)
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content || 'Aucune réponse générée.'

    return {
      provider: 'deepseek',
      content,
      model: 'deepseek-chat',
      latency: Date.now() - start,
    }
  } catch (error) {
    return {
      provider: 'deepseek',
      content: `[Erreur DeepSeek] ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      model: 'deepseek-chat',
      latency: Date.now() - start,
    }
  }
}