// Quality Gate — Évaluation et vérification automatique des réponses
// Score, cohérence, détection de hors-sujet

import type { AIResponse, ParsedQuery, ResponseScore, QualityResult, WebSource } from './types'

// ─── Score principal ─────────────────────────────────────────────────────
export function scoreResponse(
  response: AIResponse,
  query: ParsedQuery,
  webSources: WebSource[]
): QualityResult {
  const issues: string[] = []
  const scores = {
    relevance: scoreRelevance(response.content, query),
    accuracy: scoreAccuracy(response.content, query, webSources),
    freshness: scoreFreshness(response.content, query),
    completeness: scoreCompleteness(response.content, query),
    presentation: scorePresentation(response.content),
  }

  // Pondération adaptée au type de requête
  let relevanceWeight = 3
  let accuracyWeight = 3
  let freshnessWeight = 1
  let completenessWeight = 2
  let presentationWeight = 1

  if (query.isNewsQuery) {
    freshnessWeight = 4
    accuracyWeight = 4
  }
  if (query.isContestation) {
    accuracyWeight = 5
    freshnessWeight = 3
  }
  if (query.isImageRequest) {
    relevanceWeight = 5
  }

  const totalWeight = relevanceWeight + accuracyWeight + freshnessWeight + completenessWeight + presentationWeight
  const total = Math.round(
    (scores.relevance * relevanceWeight +
     scores.accuracy * accuracyWeight +
     scores.freshness * freshnessWeight +
     scores.completeness * completenessWeight +
     scores.presentation * presentationWeight) / totalWeight
  )

  // Générer les problèmes détectés
  if (scores.relevance < 40) issues.push('Réponse peu pertinente par rapport à la question')
  if (scores.accuracy < 40) issues.push('Exactitude douteuse — informations non vérifiées')
  if (scores.freshness < 30 && query.isNewsQuery) issues.push('Données potentiellement obsolètes pour une question d\'actualité')
  if (scores.completeness < 40) issues.push('Réponse incomplète')
  if (scores.presentation < 30) issues.push('Présentation de mauvaise qualité')

  // Vérification de cohérence spécifique
  if (query.isImageRequest && !response.content.includes('![') && !response.content.includes('http')) {
    issues.push('Demande d\'image mais pas de lien d\'image dans la réponse')
    scores.relevance = 0
  }

  // Si la réponse explique comment faire au lieu de faire
  if (query.isImageRequest && containsHowToExplanation(response.content)) {
    issues.push('La réponse explique comment créer une image au lieu de la générer')
    scores.relevance = 0
  }

  const passed = total >= 30 && issues.length === 0
  const suggestion = generateSuggestion(scores, query, issues)

  return {
    passed,
    score: { ...scores, total },
    issues,
    suggestion,
  }
}

// ─── Pertinence ───────────────────────────────────────────────────────────
function scoreRelevance(content: string, query: ParsedQuery): number {
  const lower = content.toLowerCase()
  const queryLower = query.text.toLowerCase()
  let score = 50 // Base

  // La réponse mentionne-t-elle des mots-clés de la question ?
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3)
  const mentionedWords = queryWords.filter(w => lower.includes(w))
  score += Math.min(30, mentionedWords.length * 5)

  // La réponse contient-elle des "je ne peux pas", "je ne sais pas" ?
  const defeatPhrases = ['je ne peux pas', 'je ne sais pas', 'i don\'t know', 'i cannot', 'impossible de', 'je n\'ai pas accès']
  if (defeatPhrases.some(p => lower.includes(p))) score -= 40

  // La réponse est-elle du hors-sujet ? (trop courte ou ne répond pas)
  if (content.length < 50) score -= 20
  if (content.length < 20) score -= 30

  return Math.max(0, Math.min(100, score))
}

// ─── Exactitude ───────────────────────────────────────────────────────────
function scoreAccuracy(content: string, query: ParsedQuery, webSources: WebSource[]): number {
  let score = 60 // Base

  // Si on a des sources web, vérifier si la réponse les utilise
  if (webSources.length > 0) {
    const sourceSnippets = webSources.map(s => s.snippet.toLowerCase()).join(' ')
    const contentLower = content.toLowerCase()

    // Bonus si les noms/entités des sources apparaissent dans la réponse
    let overlap = 0
    for (const src of webSources) {
      const titleWords = src.title.toLowerCase().split(/\s+/).filter(w => w.length > 3)
      for (const w of titleWords) {
        if (contentLower.includes(w)) overlap++
      }
    }
    score += Math.min(20, overlap * 3)

    // La réponse contredit les sources ?
    // (On ne peut pas faire une vraie vérification sémantique, mais on peut vérifier
    //  que la réponse mentionne des sources)
    if (contentLower.includes('source') || contentLower.includes('selon') || contentLower.includes('d\'après')) {
      score += 10
    }
  }

  // Pour les questions factuelles, vérifier que la réponse donne une réponse directe
  const factualStarts = ['oui', 'non', 'le ', 'la ', 'les ', 'un ', 'une ', 'en ', 'il ', 'elle ', 'c\'est', 'c\'est ', 'le président', 'la capitale', 'le prix', 'le taux']
  if (query.isNewsQuery && factualStarts.some(s => content.toLowerCase().trimStart().startsWith(s))) {
    score += 10
  }

  return Math.max(0, Math.min(100, score))
}

// ─── Fraîcheur ────────────────────────────────────────────────────────────
function scoreFreshness(content: string, query: ParsedQuery): number {
  if (!query.isNewsQuery && !query.requiresWeb) return 80 // Pas critique

  let score = 50

  // Indicateurs de fraîcheur dans la réponse
  const freshnessIndicators = [
    'en 2025', 'en 2026', 'cette année', 'actuellement', 'aujourd\'hui',
    'récemment', 'depuis', 'dernier', 'nouveau', 'nouvelle',
    'this year', 'currently', 'recently', 'as of', 'latest',
  ]
  const lower = content.toLowerCase()
  const hasFreshness = freshnessIndicators.some(ind => lower.includes(ind))
  if (hasFreshness) score += 30

  // Dates spécifiques
  const datePattern = /\b(20[0-9]{2})\b/
  const dates = content.match(datePattern)
  if (dates) {
    const currentYear = new Date().getFullYear()
    if (dates.some(d => parseInt(d) >= currentYear - 1)) {
      score += 20
    }
  }

  return Math.max(0, Math.min(100, score))
}

// ─── Complétude ───────────────────────────────────────────────────────────
function scoreCompleteness(content: string, query: ParsedQuery): number {
  let score = 50

  // Longueur minimale
  if (content.length > 200) score += 15
  if (content.length > 500) score += 10
  if (content.length > 1000) score += 5

  // Structure markdown
  const hasStructure = content.includes('#') || content.includes('**') || content.includes('- ') || content.includes('1.')
  if (hasStructure) score += 10

  // Pour les questions "qui/quoi/quel", vérifier qu'on a une réponse directe
  const questionWords = ['qui ', 'quoi ', 'quel ', 'quelle ', 'combien ', 'où ', 'quand ']
  if (questionWords.some(q => query.text.toLowerCase().startsWith(q))) {
    // La réponse devrait contenir des faits, pas juste des explications
    if (content.length > 100) score += 10
  }

  return Math.max(0, Math.min(100, score))
}

// ─── Présentation ─────────────────────────────────────────────────────────
function scorePresentation(content: string): number {
  let score = 60

  if (content.includes('# ')) score += 10     // Titres
  if (content.includes('**')) score += 10      // Gras
  if (content.includes('- ') || content.includes('* ')) score += 5  // Listes
  if (content.includes('```')) score += 5      // Code blocks
  if (content.includes('| ')) score += 5       // Tableaux
  if (content.includes('> ')) score += 5       // Citations

  // Pas trop court, pas trop long
  if (content.length > 100 && content.length < 5000) score += 5

  return Math.max(0, Math.min(100, score))
}

// ─── Vérification de cohérence entre réponses ────────────────────────────
export function checkConsistency(responses: AIResponse[], query: ParsedQuery): {
  isConsistent: boolean
  conflictInfo: string | null
  bestIndex: number
} {
  if (responses.length < 2) {
    return { isConsistent: true, conflictInfo: null, bestIndex: 0 }
  }

  // Comparer les réponses : si elles donnent des infos contradictoires
  const contents = responses.map(r => r.content.toLowerCase())

  // Détecter des entités nommées communes (noms propres entre guillemets ou titres)
  const extractEntities = (text: string) => {
    const entities: string[] = []
    // Noms propres (mots commençant par une majuscule)
    const properNounPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g
    const matches = text.match(properNounPattern)
    if (matches) entities.push(...matches)
    return entities
  }

  // Pour les questions factuelles, vérifier que les réponses convergent
  if (query.isNewsQuery) {
    // Extraire les noms propres de chaque réponse
    const entitySets = contents.map(extractEntities)

    // Trouver les entités communes
    const allEntities = new Set(entitySets.flat())
    const commonEntities = [...allEntities].filter(e =>
      entitySets.every(set => set.some(ent => ent.toLowerCase().includes(e.toLowerCase())))
    )

    // Si peu d'entités communes, possible conflit
    if (commonEntities.length === 0 && entitySets.some(s => s.length > 0)) {
      // Prendre la réponse la plus longue (plus détaillée)
      const bestIndex = responses.reduce((best, r, i) =>
        r.content.length > responses[best].content.length ? i : best, 0)
      return {
        isConsistent: false,
        conflictInfo: 'Les sources divergent — la réponse la plus détaillée a été retenue.',
        bestIndex,
      }
    }
  }

  // Prendre la meilleure réponse par qualité perçue
  const bestIndex = responses.reduce((best, r, i) => {
    const bestScore = estimateQuality(responses[best].content)
    const currentScore = estimateQuality(r.content)
    return currentScore > bestScore ? i : best
  }, 0)

  return { isConsistent: true, conflictInfo: null, bestIndex }
}

// Estimation rapide de qualité
function estimateQuality(content: string): number {
  let score = 0
  if (content.length > 100) score += 20
  if (content.length > 300) score += 10
  if (content.includes('#')) score += 10
  if (content.includes('**')) score += 10
  if (content.includes('- ')) score += 5
  if (!content.toLowerCase().includes('je ne sais pas')) score += 10
  return score
}

// ─── Détection "explication au lieu de faire" ─────────────────────────────
function containsHowToExplanation(content: string): boolean {
  const howToPhrases = [
    'pour créer une image', 'pour générer une image', 'pour dessiner',
    'voici comment', 'étapes pour', 'pour faire une image',
    'to create an image', 'to generate an image', 'how to draw',
    'steps to', 'you can create', 'use a tool like',
  ]
  return howToPhrases.some(p => content.toLowerCase().includes(p))
}

// ─── Génération de suggestion ─────────────────────────────────────────────
function generateSuggestion(scores: ResponseScore, query: ParsedQuery, issues: string[]): string {
  if (issues.length === 0) return ''

  if (query.isNewsQuery && scores.freshness < 50) {
    return 'Relancer avec plus de sources web pour des données plus récentes.'
  }
  if (query.isImageRequest && scores.relevance < 30) {
    return 'La demande concernait une image — utiliser un provider de génération d\'images.'
  }
  if (scores.accuracy < 40) {
    return 'Croiser les informations avec d\'autres sources et modèles.'
  }
  return 'Essayer un autre modèle ou reformuler la question.'
}

// ─── Sélection de la meilleure réponse ────────────────────────────────────
export function selectBestResponse(
  responses: AIResponse[],
  query: ParsedQuery,
  webSources: WebSource[]
): { response: AIResponse; quality: QualityResult; allQualities: QualityResult[] } {
  const allQualities = responses.map(r => scoreResponse(r, query, webSources))

  // Trouver la meilleure
  let bestIdx = 0
  let bestScore = 0
  for (let i = 0; i < allQualities.length; i++) {
    if (allQualities[i].score.total > bestScore) {
      bestScore = allQualities[i].score.total
      bestIdx = i
    }
  }

  return {
    response: responses[bestIdx],
    quality: allQualities[bestIdx],
    allQualities,
  }
}