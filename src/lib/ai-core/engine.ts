// ENGINE PRINCIPAL — Orchestration complète via Provider Registry
// Le cerveau qui coordonne tout

import type { FinalResponse, AIProvider, AIResponse, WebSource } from './types'
import { CREDITS_COST, PROVIDER_NAMES } from './types'
import { parseQuery, decideStrategy, selectProviders } from './router'
import { compareResponses } from './compare'
import { getActiveProviders, isProviderAvailable, type ProviderInternal } from './providers/registry'
import { queryGemini } from './providers/gemini'
import { queryClaude } from './providers/claude'
import { queryDeepSeek } from './providers/deepseek'
import { queryMistral } from './providers/mistral'
import { queryGroq } from './providers/groq'
import { queryHuggingFace } from './providers/huggingface'
import { queryOpenRouter } from './providers/openrouter'
import { queryOpenAI } from './providers/openai'
import { queryFallback } from './providers/fallback'
import { searchGoogle, searchYouTube } from '../tools/search'

// Map provider slug → function de requête
const PROVIDERS: Record<string, (msg: string) => Promise<AIResponse>> = {
  gemini: queryGemini,
  claude: queryClaude,
  deepseek: queryDeepSeek,
  mistral: queryMistral,
  groq: queryGroq,
  huggingface: queryHuggingFace,
  openrouter: queryOpenRouter,
  openai: queryOpenAI,
}

// Vérifie si un provider est disponible (actif + clé + healthy)
async function isAvailable(slug: string): Promise<boolean> {
  return isProviderAvailable(slug)
}

// Obtenir la liste des slugs configurés en DB
async function getConfiguredSlugs(): Promise<string[]> {
  const providers = await getActiveProviders()
  return providers.map(p => p.slug)
}

export async function processQuery(message: string, _userId?: string): Promise<FinalResponse> {
  const totalStart = Date.now()

  // 1. Analyser la requête
  const query = parseQuery(message)

  // 2. Décider de la stratégie
  const strategy = decideStrategy(query)

  // 3. Sélectionner les providers idéaux
  let providers = selectProviders(query, strategy)

  // 4. Vérifier les providers disponibles en DB
  const configuredSlugs = await getConfiguredSlugs()
  const useFallback = configuredSlugs.length === 0
  let webSources: WebSource[] = []

  // 5. Recherche web si nécessaire
  if (strategy === 'ai_plus_web' || query.requiresWeb) {
    try {
      const [googleResults, youtubeResults] = await Promise.allSettled([
        searchGoogle(query.text),
        searchYouTube(query.text),
      ])
      if (googleResults.status === 'fulfilled') webSources.push(...googleResults.value)
      if (youtubeResults.status === 'fulfilled') webSources.push(...youtubeResults.value)
    } catch {
      // Web search failed
    }
  }

  // 6. Enrichir le message avec les sources web
  let enrichedMessage = message
  if (webSources.length > 0) {
    const context = webSources.slice(0, 5)
      .map((s, i) => `${i + 1}. **${s.title}** (${s.url})\n   ${s.snippet}`)
      .join('\n')
    enrichedMessage = `${message}\n\n---\n**Sources web trouvées (utilise-les pour enrichir ta réponse) :**\n${context}\n---`
  }

  // 7. Exécuter les appels IA
  let aiResponses: AIResponse[] = []

  if (useFallback) {
    const response = await queryFallback(enrichedMessage)
    aiResponses = [response]
    providers = [response.provider]
  } else {
    // Filtrer : garder seulement ceux configurés et disponibles
    const availableChecks = await Promise.all(providers.map(p => isAvailable(p)))
    const availableProviders = providers.filter((_, i) => availableChecks[i])

    // Retirer les doublons de slugs (ex: openrouter qui peut faire claude)
    const uniqueSlugs = [...new Set(availableProviders)]

    if (uniqueSlugs.length === 0) {
      const response = await queryFallback(enrichedMessage)
      aiResponses = [response]
      providers = [response.provider]
    } else {
      // Limiter aux providers qui ont une fonction de requête
      const callable = uniqueSlugs.filter(s => PROVIDERS[s])

      if (callable.length === 0) {
        const response = await queryFallback(enrichedMessage)
        aiResponses = [response]
        providers = [response.provider]
      } else {
        // Appels parallèles
        const calls = callable.map(p => PROVIDERS[p](enrichedMessage))
        const results = await Promise.allSettled(calls)

        for (const result of results) {
          if (result.status === 'fulfilled') {
            aiResponses.push(result.value)
          }
        }

        // Mettre à jour la liste des providers effectivement utilisés
        providers = aiResponses.map(r => r.provider)
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
    finalContent = 'Aucune réponse disponible. Vérifiez la configuration des fournisseurs.'
  }

  // 9. Formater la réponse finale
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
  const providerNames = providers.map(p => PROVIDER_NAMES[p] || p)

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