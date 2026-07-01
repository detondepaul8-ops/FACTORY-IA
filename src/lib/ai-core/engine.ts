// ENGINE PRINCIPAL — Orchestration complète via Provider Registry
// Le cerveau qui coordonne tout

import type { FinalResponse, AIResponse, WebSource } from './types'
import { CREDITS_COST, PROVIDER_NAMES } from './types'
import { parseQuery, decideStrategy, selectProviders } from './router'
import { compareResponses } from './compare'
import { getActiveProviders, type ProviderInternal } from './providers/registry'
import { queryGemini } from './providers/gemini'
import { queryClaude } from './providers/claude'
import { queryDeepSeek } from './providers/deepseek'
import { queryMistral } from './providers/mistral'
import { queryGroq } from './providers/groq'
import { queryHuggingFace } from './providers/huggingface'
import { queryOpenRouter } from './providers/openrouter'
import { queryOpenAI } from './providers/openai'
import { queryCloudflare } from './providers/cloudflare'
import { queryPollinations } from './providers/pollinations'
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
  cloudflare: queryCloudflare,
  pollinations: queryPollinations,
}

export async function processQuery(message: string, _userId?: string): Promise<FinalResponse> {
  const totalStart = Date.now()
  let webSources: WebSource[] = []
  let strategy = 'single_ai'
  let usedProviders: string[] = []

  try {
    // 1. Analyser la requête
    const query = parseQuery(message)
    strategy = decideStrategy(query)

    // 2. Obtenir tous les providers actifs depuis la DB (avec clé)
    let dbProviders: ProviderInternal[] = []
    try {
      dbProviders = await getActiveProviders()
      console.log(`[Engine] ${dbProviders.length} providers actifs en DB: ${dbProviders.map(p => p.slug).join(', ')}`)
    } catch (dbErr) {
      console.error('[Engine] Erreur DB, fallback sur tous les providers:', dbErr)
    }

    // 3. Sélectionner les providers selon la requête
    let targetSlugs = selectProviders(query, strategy)

    // 4. Filtrer : ne garder que ceux actifs en DB avec clé
    const dbSlugs = new Set(dbProviders.map(p => p.slug))
    const available = targetSlugs.filter(s => dbSlugs.has(s))

    // 5. Si aucun provider suggéré n'est dispo, utiliser TOUS les providers actifs de la DB
    const callableSlugs = available.length > 0
      ? available
      : dbProviders.map(p => p.slug)

    // 6. Ne garder que ceux qui ont une fonction de requête
    const callable = callableSlugs.filter(s => PROVIDERS[s])

    console.log(`[Engine] Stratégie: ${strategy}, Target: [${targetSlugs.join(',')}], Dispo: [${callable.join(',')}]`)

    // 7. Recherche web si nécessaire
    if (strategy === 'ai_plus_web' || query.requiresWeb) {
      try {
        const [googleResults, youtubeResults] = await Promise.allSettled([
          searchGoogle(query.text),
          searchYouTube(query.text),
        ])
        if (googleResults.status === 'fulfilled') webSources.push(...googleResults.value)
        if (youtubeResults.status === 'fulfilled') webSources.push(...youtubeResults.value)
      } catch {
        // Recherche web échouée — on continue sans
      }
    }

    // 8. Enrichir le message avec les sources web
    let enrichedMessage = message
    if (webSources.length > 0) {
      const context = webSources.slice(0, 5)
        .map((s, i) => `${i + 1}. **${s.title}** (${s.url})\n   ${s.snippet}`)
        .join('\n')
      enrichedMessage = `${message}\n\n---\n**Sources web trouvées (utilise-les pour enrichir ta réponse) :**\n${context}\n---`
    }

    // 9. Exécuter les appels IA
    let aiResponses: AIResponse[] = []

    if (callable.length === 0) {
      // Aucun provider — utiliser le fallback en cascade
      console.warn('[Engine] Aucun provider callable, utilisation du fallback cascade')
      const response = await queryFallback(enrichedMessage)
      aiResponses = [response]
      usedProviders = [response.provider]
    } else {
      // Appels parallèles avec timeout
      const calls = callable.map(async (slug) => {
        try {
          const result = await PROVIDERS[slug](enrichedMessage)
          console.log(`[Engine] ✅ ${slug} a répondu en ${result.latency}ms`)
          return result
        } catch (err) {
          console.error(`[Engine] ❌ ${slug} a échoué:`, err instanceof Error ? err.message : err)
          return null
        }
      })

      const results = await Promise.allSettled(calls)

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          // Détecter les réponses d'erreur (certains providers retournent du contenu d'erreur au lieu de throw)
          const content = result.value.content || ''
          const isError = result.value.isError || content.startsWith('[Erreur') || content.startsWith('**⚠️')
          if (!isError) {
            aiResponses.push(result.value)
          } else {
            console.warn(`[Engine] ⚠️ ${result.value.provider} a retourné une erreur: ${content.substring(0, 100)}`)
          }
        }
      }

      usedProviders = aiResponses.map(r => r.provider)

      // Si tous ont échoué, essayer le fallback en cascade
      if (aiResponses.length === 0) {
        console.warn('[Engine] Tous les providers ont échoué, fallback cascade')
        const fallbackResp = await queryFallback(enrichedMessage)
        aiResponses = [fallbackResp]
        usedProviders = [fallbackResp.provider]
      }
    }

    // 10. Sélectionner la meilleure réponse
    let finalContent: string
    if (aiResponses.length > 1) {
      const comparison = compareResponses(aiResponses as any[])
      finalContent = comparison.bestResponse.content
    } else if (aiResponses.length === 1) {
      finalContent = aiResponses[0].content
    } else {
      finalContent = 'Aucune réponse disponible. Vérifiez la configuration des fournisseurs.'
    }

    // 11. Formater la réponse finale
    finalContent = formatFinalResponse(finalContent, strategy, usedProviders, webSources)

    return {
      content: finalContent,
      strategy,
      aiModelsUsed: usedProviders,
      webSources,
      totalLatency: Date.now() - totalStart,
      creditsCost: CREDITS_COST[strategy],
    }
  } catch (error) {
    // Erreur globale — tenter le fallback en dernier recours
    console.error('[Engine] Erreur globale:', error)
    try {
      const response = await queryFallback(message)
      return {
        content: formatFinalResponse(response.content, strategy, [response.provider], webSources),
        strategy,
        aiModelsUsed: [response.provider],
        webSources,
        totalLatency: Date.now() - totalStart,
        creditsCost: CREDITS_COST[strategy],
      }
    } catch {
      return {
        content: `**❌ Erreur interne du serveur.**\n\n${error instanceof Error ? error.message : 'Erreur inconnue'}\n\nVeuillez réessayer.`,
        strategy: 'single_ai',
        aiModelsUsed: ['error'],
        webSources: [],
        totalLatency: Date.now() - totalStart,
        creditsCost: 0,
      }
    }
  }
}

function formatFinalResponse(
  content: string,
  strategy: string,
  providers: string[],
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