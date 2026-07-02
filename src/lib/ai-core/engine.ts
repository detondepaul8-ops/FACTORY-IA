<<<<<<< HEAD
// ENGINE PRINCIPAL — Orchestration complète via Provider Registry
// Le cerveau qui coordonne tout

import type { FinalResponse, AIProvider, AIResponse, WebSource } from './types'
import { CREDITS_COST, PROVIDER_NAMES } from './types'
import { parseQuery, decideStrategy, selectProviders } from './router'
import { compareResponses } from './compare'
import { getActiveProviders, isProviderAvailable, type ProviderInternal } from './providers/registry'
=======
// ENGINE v2 — Orchestrateur intelligent FACTORY IA
// Qualité, cohérence, actualité, images, contestations

import type { FinalResponse, AIResponse, WebSource, ParsedQuery } from './types'
import { CREDITS_COST, PROVIDER_NAMES } from './types'
import { parseQuery, decideStrategy, selectProviders } from './router'
import { scoreResponse, selectBestResponse, checkConsistency } from './quality-gate'
import { getActiveProviders, type ProviderInternal } from './providers/registry'
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
import { queryGemini } from './providers/gemini'
import { queryClaude } from './providers/claude'
import { queryDeepSeek } from './providers/deepseek'
import { queryMistral } from './providers/mistral'
import { queryGroq } from './providers/groq'
import { queryHuggingFace } from './providers/huggingface'
import { queryOpenRouter } from './providers/openrouter'
import { queryOpenAI } from './providers/openai'
<<<<<<< HEAD
import { queryFallback } from './providers/fallback'
import { queryZAI } from './providers/zai'
import { searchGoogle, searchYouTube } from '../tools/search'

// Map provider slug → function de requête
=======
import { queryCloudflare } from './providers/cloudflare'
import { queryPollinations } from './providers/pollinations'
import { queryFallback } from './providers/fallback'
import { searchGoogle, searchYouTube } from '../tools/search'

>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
const PROVIDERS: Record<string, (msg: string) => Promise<AIResponse>> = {
  gemini: queryGemini,
  claude: queryClaude,
  deepseek: queryDeepSeek,
  mistral: queryMistral,
  groq: queryGroq,
  huggingface: queryHuggingFace,
  openrouter: queryOpenRouter,
  openai: queryOpenAI,
<<<<<<< HEAD
  zai: queryZAI,
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
=======
  cloudflare: queryCloudflare,
  pollinations: queryPollinations,
}

// ─── Point d'entrée principal ─────────────────────────────────────────────
export async function processQuery(message: string, _userId?: string): Promise<FinalResponse> {
  const totalStart = Date.now()
  let webSources: WebSource[] = []
  let strategy: string = 'single_ai'
  let usedProviders: string[] = []
  let qualityScore: any = undefined
  let wasRetried = false

  try {
    // 1. Analyser la requête en profondeur
    const query = parseQuery(message)
    strategy = decideStrategy(query)

    console.log(`[Engine v2] intent=${query.intent} news=${query.isNewsQuery} image=${query.isImageRequest} contest=${query.isContestation} web=${query.requiresWeb} strategy=${strategy}`)

    // 2. GÉNÉRATION D'IMAGE — traitement spécial
    if (query.isImageRequest) {
      return await handleImageGeneration(query, totalStart)
    }

    // 3. Obtenir les providers actifs
    let dbProviders: ProviderInternal[] = []
    try {
      dbProviders = await getActiveProviders()
    } catch (dbErr) {
      console.error('[Engine v2] Erreur DB:', dbErr)
    }

    // 4. Sélectionner les providers
    let targetSlugs = selectProviders(query, strategy as any)
    const dbSlugs = new Set(dbProviders.map(p => p.slug))
    let available = targetSlugs.filter(s => dbSlugs.has(s))

    // Si aucun des sélectionnés n'est dispo, prendre tous les actifs
    if (available.length === 0) {
      available = dbProviders.map(p => p.slug).filter(s => PROVIDERS[s])
    }

    // Pour l'actualité et les contestations : forcer au moins 2 providers
    if ((query.isNewsQuery || query.isContestation) && available.length < 2) {
      const extraProviders = dbProviders
        .map(p => p.slug)
        .filter(s => PROVIDERS[s] && !available.includes(s))
      available.push(...extraProviders.slice(0, 2 - available.length))
    }

    console.log(`[Engine v2] Providers sélectionnés: [${available.join(', ')}]`)

    // 5. Recherche web (obligatoire pour l'actualité et les contestations)
    if (query.isNewsQuery || query.isContestation || query.requiresWeb) {
      webSources = await performWebSearch(query.text, query.isContestation)
      console.log(`[Engine v2] ${webSources.length} sources web trouvées`)
    }

    // 6. Enrichir le message avec les sources web
    let enrichedMessage = message
    if (webSources.length > 0) {
      enrichedMessage = buildEnrichedMessage(message, webSources, query)
    }

    // 7. Pour les contestations : ajouter une instruction spéciale
    if (query.isContestation) {
      enrichedMessage = `[CONTESTATION UTILISATEUR] L'utilisateur indique que la réponse précédente était incorrecte. Tu DOIS vérifier tes informations avec les sources web fournies et donner une réponse différente, plus précise et plus récente.\n\n${enrichedMessage}`
    }

    // 8. Appeler les providers
    let aiResponses = await callProviders(available, enrichedMessage)

    // 9. QUALITY GATE — évaluer chaque réponse
    const { response: bestResponse, quality } = selectBestResponse(aiResponses, query, webSources)
    qualityScore = quality.score
    usedProviders = aiResponses.map(r => r.provider)

    console.log(`[Engine v2] Qualité: ${quality.score.total}/100, issues: [${quality.issues.join(', ')}]`)

    // 10. Si la qualité est insuffisante → RETRY avec le feedback
    if (!quality.passed && quality.score.total < 30 && aiResponses.length >= 2) {
      console.log(`[Engine v2] Qualité insuffisante, retry...`)
      wasRetried = true

      // Retenter avec un provider différent
      const usedSlugs = new Set(aiResponses.map(r => r.provider))
      const retryProviders = dbProviders
        .map(p => p.slug)
        .filter(s => PROVIDERS[s] && !usedSlugs.has(s))

      if (retryProviders.length > 0) {
        const retryMessage = `[QUALITÉ INSUFFISANTE] La réponse précédente était de mauvaise qualité. Problèmes: ${quality.issues.join('; ')}. Donne une réponse meilleure, plus directe et plus pertinente.\n\n${enrichedMessage}`

        const retryResponses = await callProviders(retryProviders.slice(0, 2), retryMessage)
        if (retryResponses.length > 0) {
          const { response: retryBest, quality: retryQuality } = selectBestResponse(retryResponses, query, webSources)
          if (retryQuality.score.total > quality.score.total) {
            aiResponses = retryResponses
            qualityScore = retryQuality.score
            console.log(`[Engine v2] Retry amélioré: ${retryQuality.score.total}/100`)
          }
        }
      }
    }

    // 11. Vérification de cohérence entre réponses
    if (aiResponses.length > 1) {
      const { isConsistent, conflictInfo } = checkConsistency(aiResponses, query)
      if (!isConsistent && conflictInfo) {
        console.log(`[Engine v2] Conflit détecté: ${conflictInfo}`)
      }
    }

    // 12. Formater la réponse finale
    const finalContent = aiResponses.length > 0
      ? formatFinalResponse(aiResponses[0].content, strategy, usedProviders, webSources, query, qualityScore)
      : 'Aucune réponse disponible.'

    return {
      content: finalContent,
      strategy: strategy as any,
      aiModelsUsed: usedProviders,
      webSources,
      totalLatency: Date.now() - totalStart,
      creditsCost: CREDITS_COST[strategy as keyof typeof CREDITS_COST] || 1,
      qualityScore,
      wasRetried,
    }
  } catch (error) {
    console.error('[Engine v2] Erreur globale:', error)
    try {
      const response = await queryFallback(message)
      return {
        content: formatFinalResponse(response.content, strategy, [response.provider], webSources, parseQuery(message), undefined),
        strategy: strategy as any,
        aiModelsUsed: [response.provider],
        webSources,
        totalLatency: Date.now() - totalStart,
        creditsCost: 1,
      }
    } catch {
      return {
        content: `**❌ Erreur interne.** ${error instanceof Error ? error.message : ''}`,
        strategy: 'single_ai',
        aiModelsUsed: ['error'],
        webSources: [],
        totalLatency: Date.now() - totalStart,
        creditsCost: 0,
      }
    }
  }
}

// ─── Génération d'images ─────────────────────────────────────────────────
async function handleImageGeneration(query: ParsedQuery, totalStart: number): Promise<FinalResponse> {
  // Extraire le prompt d'image de la question
  const imagePrompt = extractImagePrompt(query.text)

  try {
    // Utiliser Pollinations Image API (gratuit)
    const encodedPrompt = encodeURIComponent(imagePrompt)
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${Date.now()}`

    const content = `![${imagePrompt}](${imageUrl})\n\n**🖼️ Image générée** : *${imagePrompt}*\n\n> Via Pollinations AI (gratuit)`

    return {
      content: `**🧠 Génération d'image** | Modèles : Pollinations AI\n\n---\n\n${content}`,
      strategy: 'image_generation',
      aiModelsUsed: ['pollinations'],
      webSources: [],
      totalLatency: Date.now() - totalStart,
      creditsCost: 1,
    }
  } catch (error) {
    const encodedPrompt = encodeURIComponent(imagePrompt)
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${Date.now()}`

    return {
      content: `**🧠 Génération d'image** | Modèles : Pollinations AI\n\n---\n\n![${imagePrompt}](${imageUrl})\n\n**🖼️ Image** : *${imagePrompt}*\n\n> L'image est en cours de génération. Si elle ne s'affiche pas, [cliquez ici](${imageUrl}).`,
      strategy: 'image_generation',
      aiModelsUsed: ['pollinations'],
      webSources: [],
      totalLatency: Date.now() - totalStart,
      creditsCost: 1,
    }
  }
}

function extractImagePrompt(text: string): string {
  // Supprimer les verbes de demande
  let prompt = text
    .replace(/^(crée|génère|dessine|produis|fait|imagine|visualise|montre)\s+(une?\s+)?(image|photo|portrait|illustration|logo|affiche|icône|bannière)\s+(de\s+|d\u0027)/i, '')
    .replace(/^(créer|générer|dessiner|produire|faire|imaginer|visualiser|montrer)\s+(une?\s+)?(image|photo|portrait|illustration|logo|affiche|icône|bannière)\s+(de\s+|d\u0027)/i, '')
    .trim()

  if (prompt.length < 5) prompt = text // Si trop court, utiliser le texte original
  return prompt
}

// ─── Recherche web ────────────────────────────────────────────────────────
async function performWebSearch(query: string, isContestation: boolean): Promise<WebSource[]> {
  const sources: WebSource[] = []

  // Pour les contestations, varier la requête de recherche
  const searchQuery = isContestation
    ? `${query} vérifié mise à jour 2025 2026`
    : query

  try {
    const [googleResults, youtubeResults] = await Promise.allSettled([
      searchGoogle(searchQuery),
      searchYouTube(searchQuery),
    ])
    if (googleResults.status === 'fulfilled') sources.push(...googleResults.value)
    if (youtubeResults.status === 'fulfilled') sources.push(...youtubeResults.value)
  } catch {
    // Search failed — continue without
  }

  return sources
}

// ─── Construction du message enrichi ──────────────────────────────────────
function buildEnrichedMessage(message: string, sources: WebSource[], query: ParsedQuery): string {
  const context = sources.slice(0, 5)
    .map((s, i) => `${i + 1}. **${s.title}** (${s.url})\n   ${s.snippet}`)
    .join('\n')

  let instruction = '**Sources web trouvées (utilise-les pour enrichir ta réponse) :**'

  if (query.isNewsQuery) {
    instruction = '**⚠️ QUESTION D\'ACTUALITÉ** — Les sources web ci-dessous contiennent des informations récentes. Utilise OBLIGATOIREMENT ces sources pour répondre. Si les sources contredisent tes connaissances, privilégie les informations des sources web les plus récentes :**'
  }

  if (query.isContestation) {
    instruction = '**⚠️ CONTESTATION** — L\'utilisateur a indiqué que la réponse précédente était incorrecte. Les sources web ci-dessous doivent te permettre de donner une réponse VÉRIFIÉE et DIFFÉRENTE de la précédente :**'
  }

  return `${message}\n\n---\n${instruction}\n${context}\n---`
}

// ─── Appels providers parallèles ──────────────────────────────────────────
async function callProviders(slugs: string[], message: string): Promise<AIResponse[]> {
  const results = await Promise.allSettled(
    slugs.map(async (slug) => {
      try {
        const result = await PROVIDERS[slug](message)
        const isError = result.isError || (result.content || '').startsWith('[Erreur')
        if (!isError) {
          console.log(`[Engine v2] ✅ ${slug} (${result.latency}ms)`)
          return result
        }
        console.warn(`[Engine v2] ⚠️ ${slug} erreur: ${(result.content || '').substring(0, 80)}`)
        return null
      } catch (err) {
        console.error(`[Engine v2] ❌ ${slug} échoué:`, err instanceof Error ? err.message : err)
        return null
      }
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<AIResponse> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value)
}

// ─── Formatage final ──────────────────────────────────────────────────────
function formatFinalResponse(
  content: string,
  strategy: string,
  providers: string[],
  webSources: WebSource[],
  query?: ParsedQuery,
  qualityScore?: any
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
): string {
  const providerNames = providers.map(p => PROVIDER_NAMES[p] || p)

  const strategyLabel: Record<string, string> = {
    single_ai: 'IA Unique',
    multi_ai: 'Multi-IA Comparée',
    ai_plus_web: 'IA + Recherche Web',
<<<<<<< HEAD
=======
    image_generation: 'Génération d\'image',
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
  }

  let header = ''
  if (webSources.length > 0) {
<<<<<<< HEAD
    header += `**📚 ${webSources.length} source(s) web analysée(s)** | `
  }
  header += `**🧠 ${strategyLabel[strategy]}** | Modèles : ${providerNames.join(', ')}`
=======
    header += `**📚 ${webSources.length} source(s) web** | `
  }
  if (query?.isNewsQuery) {
    header += '🕐 **Info actualité** | '
  }
  if (query?.isContestation) {
    header += '🔄 **Vérifié** | '
  }
  header += `**🧠 ${strategyLabel[strategy] || strategy}** | Modèles : ${providerNames.join(', ')}`
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3

  return `${header}\n\n---\n\n${content}`
}