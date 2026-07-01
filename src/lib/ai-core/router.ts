// Routeur intelligent — Analyse les requêtes et décide la stratégie

import { type ParsedQuery, type QueryIntent, type QueryStrategy, AI_PROFILES, type AIProvider } from './types'

// Mots-clés par intention
const INTENT_KEYWORDS: Record<QueryIntent, string[]> = {
  code: ['code', 'fonction', 'function', 'programme', 'script', 'api', 'html', 'css', 'javascript', 'python', 'react', 'bug', 'déboguer', 'compile', 'algorithm', 'sql', 'database', 'reqête', 'endpoint', 'docker', 'git', 'class', 'component'],
  writing: ['rédige', 'écris', 'write', 'article', 'essay', 'lettre', 'email', 'rapport', 'texte', 'contenu', 'description', 'story', 'poème', 'poem', 'blog', 'copie', 'copywriting'],
  analysis: ['analyse', 'analyze', 'compare', 'évalue', 'explain', 'explique', 'pourquoi', 'comment', 'avantage', 'inconvénient', 'pro', 'contra', 'impact', 'conséquence', 'statistique', 'data', 'donnée'],
  translation: ['traduis', 'translate', 'translation', 'en anglais', 'en français', 'en chinois', 'version anglaise', 'version française'],
  research: ['recherche', 'search', 'trouve', 'find', 'dernières', 'actualité', 'news', 'récent', '2024', '2025', '2026', 'étude', 'rapport', 'source', 'référence'],
  math: ['calcule', 'calculate', 'combien', 'équation', 'formule', 'math', 'pourcentage', 'statistiques', 'probabilité', 'intégrale', 'dérivée', 'nombre'],
  creative: ['crée', 'create', 'idée', 'idea', 'brainstorm', 'nom', 'logo', 'slogan', 'concept', 'design', 'invente', 'imagine', 'histoire', 'scénario'],
  general: [],
}

// Mots déclenchant une recherche web
const WEB_TRIGGERS = [
  'dernier', 'récent', 'actuel', 'aujourd\'hui', '2024', '2025', '2026',
  'actualité', 'news', 'prix', 'taux', 'événement', 'évènement',
  'météo', 'cours', 'bourse', 'match', 'score', 'résultat',
  'recherche', 'trouve', 'cherche', 'google', 'sur internet',
  'vidéo', 'youtube', 'tutorial', 'tuto',
]

export function parseQuery(message: string): ParsedQuery {
  const text = message.trim()
  if (!text) throw new Error('Message vide')

  const intent = detectIntent(text)
  const language = detectLanguage(text)
  const requiresWeb = detectWebNeed(text, intent)
  const urgency = detectUrgency(text)
  const complexity = detectComplexity(text)

  return { text, intent, language, requiresWeb, urgency, complexity }
}

function detectIntent(text: string): QueryIntent {
  const lower = text.toLowerCase()
  let bestIntent: QueryIntent = 'general'
  let bestScore = 0

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [QueryIntent, string[]][]) {
    if (intent === 'general') continue
    const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0)
    if (score > bestScore) {
      bestScore = score
      bestIntent = intent
    }
  }

  return bestIntent
}

function detectLanguage(text: string): string {
  const frenchPatterns = /[àâäéèêëïîôùûüÿç]|le |la |les |de |des |du |un |une |est |sont |pour |avec |dans |que |qui |sur |ce /
  const hasFrench = frenchPatterns.test(text.toLowerCase())
  return hasFrench ? 'fr' : 'en'
}

function detectWebNeed(text: string, intent: QueryIntent): boolean {
  const lower = text.toLowerCase()
  const hasWebTrigger = WEB_TRIGGERS.some(trigger => lower.includes(trigger))
  if (hasWebTrigger) return true
  if (intent === 'research') return true
  // Questions factuelles qui nécessitent des données à jour
  const factualPatterns = [/combien\s+(coûte|est)/i, /quel\s+(est|est\s+le)\s+(prix|taux|cours)/i, /météo/i, /cours\s+de/i]
  return factualPatterns.some(p => p.test(lower))
}

function detectUrgency(text: string): 'low' | 'medium' | 'high' {
  const lower = text.toLowerCase()
  if (/urgent|vite|répide|immédiat|asap|rapide/i.test(lower)) return 'high'
  if (/détaille|complet|approfondi|en profondeur|thorough/i.test(lower)) return 'low'
  return 'medium'
}

function detectComplexity(text: string): 'simple' | 'moderate' | 'complex' {
  const wordCount = text.split(/\s+/).length
  if (wordCount < 10) return 'simple'
  if (wordCount < 30) return 'moderate'
  // Vérifie s'il y a des demandes multi-parties
  const hasMultipleParts = (text.match(/[.?!\n]/g) || []).length > 2
  return hasMultipleParts ? 'complex' : 'moderate'
}

// Décide la stratégie optimale
export function decideStrategy(query: ParsedQuery): QueryStrategy {
  // Si le web est requis → IA + Web
  if (query.requiresWeb) return 'ai_plus_web'
  // Si complexe ou comparaison demandée → Multi-IA
  if (query.complexity === 'complex') return 'multi_ai'
  // Si demande de comparaison explicite → Multi-IA
  const lower = query.text.toLowerCase()
  if (/compar|différence|versus|vs|meilleur entre|qui est meilleur/i.test(lower)) return 'multi_ai'
  // Par défaut → IA seule (la plus adaptée)
  return 'single_ai'
}

// Sélectionne le(s) meilleur(s) IA pour la requête
export function selectProviders(query: ParsedQuery, strategy: QueryStrategy): string[] {
  const { intent, language, urgency } = query

  // Score chaque provider
  const scored = Object.entries(AI_PROFILES)
    .map(([id, profile]) => {
      let score = 0
      // Force correspondant à l'intention
      if (profile.strengths.includes(intent)) score += 10
      // Bonus langue
      if (profile.languages.includes(language)) score += 5
      // Bonus vitesse si urgent
      if (urgency === 'high') score += profile.speed * 2
      // Bonus modération si peu urgent (qualité > vitesse)
      if (urgency === 'low') score += (6 - profile.speed)
      return { id, score }
    })
    .sort((a, b) => b.score - a.score)

  if (strategy === 'single_ai') {
    return [scored[0]?.id || 'gemini']
  }

  // Multi-IA ou AI+Web : prendre les 2-3 meilleurs
  const count = Math.min(strategy === 'multi_ai' ? 3 : 1, scored.length)
  return scored.slice(0, count).map(s => s.id)
}

// Sélectionne le provider principal pour une requête simple
export function selectPrimaryProvider(query: ParsedQuery): string {
  return selectProviders(query, 'single_ai')[0]
}