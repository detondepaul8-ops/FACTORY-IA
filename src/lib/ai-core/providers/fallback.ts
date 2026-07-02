<<<<<<< HEAD
// Fallback Provider — Utilise z-ai-web-dev-sdk comme IA de secours
// Quand aucune clé API externe n'est configurée
=======
// Fallback Provider — Dernier recours si aucun provider ne répond
// PLUS DE MODE DÉMO — essaie tous les providers en cascade
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
import type { AIResponse } from '../types'

export async function queryFallback(message: string): Promise<AIResponse> {
  const start = Date.now()
<<<<<<< HEAD
  try {
    // Utiliser le SDK interne comme provider de fallback
    const { createLlmChat } = await import('z-ai-web-dev-sdk')
    const chat = createLlmChat()

    const response = await chat.chat({
      messages: [
        {
          role: 'system',
          content: 'Tu es FACTORY IA, un assistant intelligent qui combine plusieurs sources. Réponds de façon claire, structurée et précise. Utilise le Markdown pour formater tes réponses. Si la question est en français, réponds en français.'
        },
        {
          role: 'user',
          content: message,
        }
      ],
    })

    const content = typeof response === 'string' ? response : response?.content || response?.text || JSON.stringify(response)

    return {
      provider: 'gemini', // Se fait passer pour Gemini comme fallback principal
      content: String(content),
      model: 'factory-ia-fallback',
      latency: Date.now() - start,
    }
  } catch {
    // Fallback ultime : réponse simulée pour démo
    return {
      provider: 'gemini',
      content: generateDemoResponse(message),
      model: 'factory-ia-demo',
      latency: Date.now() - start,
    }
  }
}

// Réponse de démonstration quand aucun API n'est dispo
function generateDemoResponse(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('bonjour') || lower.includes('salut') || lower.includes('hello')) {
    return `# 👋 Bonjour !

Bienvenue sur **FACTORY IA** — votre plateforme intelligente multi-IA.

Je suis prêt à vous aider avec :
- **Rédaction** : articles, emails, rapports
- **Code** : développement, debugging, architecture
- **Recherche** : informations à jour, analyse web
- **Analyse** : données, comparaisons, raisonnement
- **Création** : idées, concepts, brainstorming

Comment puis-je vous aider aujourd'hui ?`
  }

  return `# 🧠 Réponse FACTORY IA

> **Note** : Cette réponse est générée en mode démo. Configurez vos clés API (Gemini, Claude, DeepSeek, Mistral, Groq) pour activer le plein potentiel multi-IA.

## Votre question

"${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"

## Analyse de la requête

FACTORY IA a analysé votre demande et déterminé la stratégie optimale de traitement. En mode de production, cette requête serait :

1. **Analysée** par le routeur intelligent (détection d'intention, langue, complexité)
2. **Traitéée** par le(s) meilleur(s) modèle(s) d'IA sélectionné(s) automatiquement
3. **Enrichie** avec une recherche web si nécessaire
4. **Comparée** si plusieurs IA sont sollicitées
5. **Optimisée** pour produire la réponse finale la plus fiable

## Configuration requise

Pour activer le système complet, ajoutez ces variables d'environnement :

| Variable | Service |
|----------|---------|
| \`GEMINI_API_KEY\` | Google Gemini |
| \`CLAUDE_API_KEY\` | Anthropic Claude |
| \`DEEPSEEK_API_KEY\` | DeepSeek |
| \`MISTRAL_API_KEY\` | Mistral AI |
| \`GROQ_API_KEY\` | Groq |
| \`GOOGLE_CX\` | Google Custom Search |
| \`YOUTUBE_API_KEY\` | YouTube Data API |

Le système fonctionne en mode fallback avec z-ai-web-dev-sdk en attendant.`
=======
  const errors: string[] = []

  // Essayer chaque provider activé en cascade
  const providerSlugs = ['gemini', 'mistral', 'openrouter', 'groq', 'huggingface', 'cloudflare', 'openai', 'deepseek']

  for (const slug of providerSlugs) {
    try {
      const { getProvider, recordProviderCall } = await import('./registry')
      const provider = await getProvider(slug)
      if (!provider || !provider.apiKey) {
        errors.push(`${slug}: non configuré`)
        continue
      }

      const result = await callProviderDirectly(provider, message)
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      errors.push(`${slug}: ${msg}`)
    }
  }

  // Si vraiment rien ne marche, retourner une erreur claire
  return {
    provider: 'fallback',
    content: `**⚠️ Tous les fournisseurs IA sont indisponibles.**\n\nDétails des erreurs :\n${errors.map(e => `- ${e}`).join('\n')}\n\nVérifiez la configuration des clés API dans le panneau d'administration.`,
    model: 'fallback-error',
    latency: Date.now() - start,
    isError: true,
  }
}

// Appel direct d'un provider sans passer par les fonctions spécifiques
async function callProviderDirectly(provider: { slug: string; baseUrl: string; apiKey: string; authPrefix: string; authHeader: string; defaultModel: string; apiType: string }, message: string): Promise<AIResponse> {
  const start = Date.now()
  const { recordProviderCall } = await import('./registry')

  try {
    let url: string
    let body: unknown

    if (provider.apiType === 'gemini') {
      url = `${provider.baseUrl}?key=${provider.apiKey}`
      body = {
        contents: [{ parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: 4096 },
      }
    } else {
      url = provider.baseUrl
      body = {
        model: provider.defaultModel,
        messages: [
          { role: 'system', content: 'Tu es un assistant IA intelligent. Réponds de façon structurée en Markdown.' },
          { role: 'user', content: message },
        ],
        max_tokens: 4096,
        temperature: 0.7,
      }
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (provider.apiType !== 'gemini') {
      headers[provider.authHeader || 'Authorization'] = `${provider.authPrefix}${provider.apiKey}`
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) {
      const err = await res.text().catch(() => 'Pas de détail')
      throw new Error(`HTTP ${res.status}: ${err.substring(0, 200)}`)
    }

    const data = await res.json()
    let content: string

    if (provider.apiType === 'gemini') {
      content = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Aucune réponse.'
    } else {
      // Support Workers AI (result.choices) et OpenAI-compatible (choices)
      const choices = data?.result?.choices || data?.choices || []
      content = choices[0]?.message?.content || choices[0]?.text || 'Aucune réponse.'
    }

    const latency = Date.now() - start
    await recordProviderCall(provider.slug, true, latency)

    return {
      provider: provider.slug,
      content,
      model: provider.defaultModel,
      latency,
    }
  } catch (error) {
    const latency = Date.now() - start
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    await recordProviderCall(provider.slug, false, latency, msg).catch(() => {})
    throw error
  }
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
}