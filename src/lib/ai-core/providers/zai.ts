// Fournisseur Z IA — API interne Z.ai (GLM-4-Plus)
// Authentification double : Bearer apiKey + X-Token header
import type { AIResponse } from '../types'
import { getProvider, recordProviderCall } from './registry'

const ZAI_SYSTEM_PROMPT = `Tu es FACTORY IA, un assistant intelligent multi-IA. Réponds de façon claire, structurée et précise. Utilise le Markdown pour formater tes réponses. Si la question est en français, réponds en français. Sois concis mais complet.`

export async function queryZAI(message: string, systemPrompt?: string): Promise<AIResponse> {
  const start = Date.now()
  try {
    const provider = await getProvider('zai')
    if (!provider) throw new Error('Z IA non configuré')

    // Le apiKeyEncrypted contient du JSON : {"apiKey":"...","token":"..."}
    let apiKey = provider.apiKey
    let xToken = ''

    try {
      const parsed = JSON.parse(provider.apiKey)
      if (parsed.apiKey) apiKey = parsed.apiKey
      if (parsed.token) xToken = parsed.token
    } catch {
      // Pas du JSON, utiliser directement comme apiKey
    }

    // Si pas de token dans la DB, chercher dans les variables d'environnement
    if (!xToken && process.env.Z_AI_TOKEN) {
      xToken = process.env.Z_AI_TOKEN
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-Z-AI-From': 'Z',
    }
    if (xToken) {
      headers['X-Token'] = xToken
    }

    const messages = []
    messages.push({ role: 'system', content: systemPrompt || ZAI_SYSTEM_PROMPT })
    messages.push({ role: 'user', content: message })

    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: provider.defaultModel,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
        thinking: { type: 'disabled' },
      }),
      signal: AbortSignal.timeout(60000),
    })

    if (!res.ok) {
      const err = await res.text()
      const msg = `Z IA API error ${res.status}: ${err}`
      await recordProviderCall('zai', false, Date.now() - start, msg)
      throw new Error(msg)
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content || 'Aucune réponse générée.'
    const latency = Date.now() - start
    await recordProviderCall('zai', true, latency)

    return { provider: 'zai', content, model: data?.model || provider.defaultModel, latency }
  } catch (error) {
    const latency = Date.now() - start
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    if (!msg.includes('Z IA API error')) {
      await recordProviderCall('zai', false, latency, msg)
    }
    return { provider: 'zai', content: `[Erreur Z IA] ${msg}`, model: 'glm-4-plus', latency }
  }
}