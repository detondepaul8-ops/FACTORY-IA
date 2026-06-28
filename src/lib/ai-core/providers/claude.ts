// Fournisseur Claude — Rédaction + Anglais
import type { AIResponse } from '../types'

export async function queryClaude(message: string, _systemPrompt?: string): Promise<AIResponse> {
  const start = Date.now()
  try {
    const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || ''
    const url = 'https://api.anthropic.com/v1/messages'

    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: message }],
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Claude API error ${res.status}: ${err}`)
    }

    const data = await res.json()
    const content = data?.content?.[0]?.text || 'Aucune réponse générée.'

    return {
      provider: 'claude',
      content,
      model: 'claude-sonnet-4-20250514',
      latency: Date.now() - start,
    }
  } catch (error) {
    return {
      provider: 'claude',
      content: `[Erreur Claude] ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      model: 'claude-sonnet-4-20250514',
      latency: Date.now() - start,
    }
  }
}