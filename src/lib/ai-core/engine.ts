// ENGINE PRINCIPAL — Orchestration complète
// Le cerveau qui coordonne tout

import type { FinalResponse, AIProvider, AIResponse, WebSource } from './types'
import { CREDITS_COST } from './types'
import { parseQuery, decideStrategy, selectProviders } from './router'
import { compareResponses } from './compare'
import { queryGemini } from './providers/gemini'
import { queryClaude } from './providers/claude'
import { queryDeepSeek } from './providers/deepseek'
import { queryMistral } from './providers/mistral'
import { queryGroq } from './providers/groq'
import { queryFallback } from './providers/fallback'
import { searchGoogle, searchYouTube } from '../tools/search'

// Map provider → function
const PROVIDERS: Record<AIProvider, (msg: string) => Promise<AIResponse>> = {
  gemini: queryGemini,
  claude: queryClaude,
  deepseek: queryDeepSeek,
  mistral: queryMistral,
  groq: queryGroq,
}

// Vérifie si un provider a une clé API configurée
function hasApiKey(provider: AIProvider): boolean {
  const keys: Record<AIProvider, string> = {
    gemini: process.env.GEMINI_API_KEY || '',
    claude: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || '',
    deepseek: process.env.DEEPSEEK_API_KEY || '',
    mistral: process.env.MISTRAL_API_KEY || '',
    groq: process.env.GROQ_API_KEY || '',
  }
  return !!keys[provider]
}

// Vérifie si au moins une clé API est configurée
function hasAnyApiKey(): boolean {
  return (Object.keys(PROVIDERS) as AIProvider[]).some(hasApiKey)
}

export async function processQuery(message: string, _userId?: string): Promise<FinalResponse> {
  const totalStart = Date.now()

  // 1. Analyser la requête
  const query = parseQuery(message)

  // 2. Décider de la stratégie
  const strategy = decideStrategy(query)

  // 3. Sélectionner les providers
  let providers = selectProviders(query, strategy)

  // 4. Si aucune clé API configurée, utiliser le fallback
  const useFallback = !hasAnyApiKey()
  let webSources: WebSource[] = []

  // 5. Recherche web si nécessaire
  if (strategy === 'ai_plus_web' || query.requiresWeb) {
    try {
      const [googleResults, youtubeResults] = await Promise.allSettled([
        searchGoogle(query.text),
        searchYouTube(query.text),
      ])

      if (googleResults.status === 'fulfilled') {
        webSources.push(...googleResults.value)
      }
      if (youtubeResults.status === 'fulfilled') {
        webSources.push(...youtubeResults.value)
      }
    } catch {
      // Web search failed, continue with AI only
    }
  }

  // 6. Construire le prompt enrichi si on a des sources web
  let enrichedMessage = message
  if (webSources.length > 0) {
    const context = webSources
      .slice(0, 5)
      .map((s, i) => `${i + 1}. **${s.title}** (${s.url})\n   ${s.snippet}`)
      .join('\n')

    enrichedMessage = `${message}\n\n---\n**Sources web trouvées (utilise-les pour enrichir ta réponse) :**\n${context}\n---`
  }

  // 7. Exécuter les appels IA
  let aiResponses: AIResponse[] = []

  if (useFallback) {
    // Mode fallback : utiliser z-ai-web-dev-sdk
    const response = await queryFallback(enrichedMessage)
    aiResponses = [response]
    providers = [response.provider]
  } else {
    // Filtrer les providers sans clé
    const availableProviders = providers.filter(hasApiKey)

    if (availableProviders.length === 0) {
      // Aucun provider disponible, utiliser fallback
      const response = await queryFallback(enrichedMessage)
      aiResponses = [response]
      providers = [response.provider]
    } else {
      // Appels parallèles
      const calls = availableProviders.map(p => PROVIDERS[p](enrichedMessage))
      const results = await Promise.allSettled(calls)

      for (const result of results) {
        if (result.status === 'fulfilled') {
          aiResponses.push(result.value)
        }
      }
    }
  }

  // 8. Comparer / sélectionner la meilleure réponse
  let finalContent: string
  if (aiResponses.length > 1) {
    const comparison = compareResponses(aiResponses)
    finalContent = comparison.bestResponse.content
  } else if (aiResponses.length === 1) {
    finalContent = aiResponses[0].content
  } else {
    finalContent = 'Aucune réponse disponible. Vérifiez la configuration des API.'
  }

  // 9. Ajouter le header FACTORY IA
  finalContent = formatFinalResponse(finalContent, strategy, providers, webSources)

  return {
    content: finalContent,
    strategy,
    aiModelsUsed: providers,
    webSources,
    totalLatency: Date.now() - totalStart,
    creditsCost: CREDITS_COST[strategy],
  }
}

function formatFinalResponse(
  content: string,
  strategy: string,
  providers: AIProvider[],
  webSources: WebSource[]
): string {
  const providerNames = providers.map(p => {
    const names: Record<AIProvider, string> = {
      gemini: 'Gemini',
      claude: 'Claude',
      deepseek: 'DeepSeek',
      mistral: 'Mistral',
      groq: 'Groq',
    }
    return names[p]
  })

  const strategyLabel: Record<string, string> = {
    single_ai: 'IA Unique',
    multi_ai: 'Multi-IA Comparée',
    ai_plus_web: 'IA + Recherche Web',
  }

  let header = ''

  if (webSources.length > 0) {
    header += `**📚 ${webSources.length} source(s) web analysée(s)** | `
  }
  header += `**🧠 ${strategyLabel[strategy]}** | Modèles : ${providerNames.join(', ')}`

  return `${header}\n\n---\n\n${content}`
}