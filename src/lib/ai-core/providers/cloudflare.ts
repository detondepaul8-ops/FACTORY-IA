// Fournisseur Cloudflare Workers AI
// L'API Workers AI utilise le modèle dans l'URL, pas dans le body
import type { AIResponse } from '../types'
import { getProvider, recordProviderCall } from './registry'

export async function queryCloudflare(message: string, _systemPrompt?: string): Promise<AIResponse> {
  const start = Date.now()
  try {
    const provider = await getProvider('cloudflare')
    if (!provider) throw new Error('Cloudflare Workers AI non configuré')

    // baseUrl = https://api.cloudflare.com/client/v4/accounts/ID/ai/run/
    // model = @cf/meta/llama-3.1-8b-instruct
    const url = `${provider.baseUrl}${provider.defaultModel}`

    const body = {
      messages: [
        { role: 'system', content: 'Tu es un assistant IA intelligent. Réponds de façon structurée en Markdown.' },
        { role: 'user', content: message },
      ],
      max_tokens: 4096,
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `${provider.authPrefix}${provider.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      const msg = `Cloudflare API error ${res.status}: ${err}`
      await recordProviderCall('cloudflare', false, Date.now() - start, msg)
      throw new Error(msg)
    }

    const data = await res.json()

    if (!data.success) {
      const errMsg = data.errors?.[0]?.message || 'Erreur inconnue Workers AI'
      await recordProviderCall('cloudflare', false, Date.now() - start, errMsg)
      throw new Error(errMsg)
    }

    // Workers AI peut retourner text ou message.content
    const choices = data.result?.choices || []
    const content = choices[0]?.message?.content || choices[0]?.text || 'Aucune réponse générée.'
    const latency = Date.now() - start
    await recordProviderCall('cloudflare', true, latency)

    return { provider: 'cloudflare' as AIResponse['provider'], content, model: provider.defaultModel, latency }
  } catch (error) {
    const latency = Date.now() - start
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    if (!msg.includes('Cloudflare API error')) {
      await recordProviderCall('cloudflare', false, latency, msg)
    }
    return { provider: 'cloudflare' as AIResponse['provider'], content: `[Erreur Cloudflare] ${msg}`, model: 'cloudflare', latency }
  }
}