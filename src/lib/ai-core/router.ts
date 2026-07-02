<<<<<<< HEAD
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

=======
// Routeur intelligent v2 — Analyse profonde des requêtes
// Détection d'intention avancée avec gestion d'actualité, images, contestations

import { type ParsedQuery, type QueryIntent, type QueryStrategy, AI_PROFILES } from './types'

// ─── Mots-clés par intention ─────────────────────────────────────────────
const INTENT_KEYWORDS: Record<QueryIntent, string[]> = {
  code: ['code', 'fonction', 'function', 'programme', 'script', 'api', 'html', 'css', 'javascript', 'typescript', 'python', 'react', 'vue', 'next.js', 'bug', 'déboguer', 'debugger', 'compile', 'algorithm', 'algorithme', 'sql', 'database', 'base de données', 'reqête', 'requête', 'endpoint', 'docker', 'git', 'class', 'component', 'composant', 'hook', 'middleware', 'backend', 'frontend', 'serveur', 'server'],
  writing: ['rédige', 'écris', 'write', 'article', 'essay', 'lettre', 'email', 'rapport', 'texte', 'contenu', 'description', 'story', 'histoire', 'poème', 'poem', 'blog', 'copie', 'copywriting', 'résumé', 'summary', 'synthèse', 'compte-rendu', 'brief', 'dissertation'],
  analysis: ['analyse', 'analyze', 'compare', 'évalue', 'evaluate', 'explain', 'explique', 'pourquoi', 'why', 'comment', 'how', 'avantage', 'inconvénient', 'pro', 'contra', 'impact', 'conséquence', 'statistique', 'data', 'donnée', 'cause', 'effet', 'enjeu', 'risque', 'opportunité'],
  translation: ['traduis', 'translate', 'translation', 'en anglais', 'en français', 'en chinois', 'version anglaise', 'version française', 'traduction', 'anglais vers', 'français vers'],
  research: ['recherche', 'search', 'trouve', 'find', 'cherche', 'donne-moi des infos', 'quelles sont les sources', 'référence', 'bibliographie'],
  math: ['calcule', 'calculate', 'combien', 'équation', 'formule', 'math', 'pourcentage', 'statistiques', 'probabilité', 'intégrale', 'dérivée', 'nombre', 'addition', 'multiplication', 'division', 'racine', 'puissance', 'surface', 'volume', 'aire'],
  creative: ['invente', 'imagine', 'brainstorm', 'concept', 'scénario', 'conte', 'nouvelle', 'chanson', 'parole'],
  image_generation: [],
  general: [],
}

// ─── Mots-clés GÉNÉRATION D'IMAGE (priorité haute) ────────────────────────
const IMAGE_VERBS = [
  'créer une image', 'générer une image', 'dessiner', 'dessine', 'illustrer',
  'produire une image', 'génère une image', 'crée une image', 'créer un logo',
  'faire un portrait', 'générer un portrait', 'créer une affiche', 'faire une affiche',
  'créer une icône', 'générer une illustration', 'créer une bannière',
]
const IMAGE_NOUNS = [
  'image de', 'photo de', 'portrait de', 'illustration de', 'dessin de',
  'logo pour', 'affiche de', 'bannière', 'miniature', 'thumbnail',
  'fond d\'écran', 'wallpaper', 'mème', 'meme',
]
const IMAGE_PATTERNS = [
  /génère?\s+(une?\s+)?(image|photo|illustration|logo|affiche|portrait|icône|bannière)/i,
  /cré[eé]r?\s+(une?\s+)?(image|photo|illustration|logo|affiche|portrait|icône|bannière)/i,
  /dessin[eé]?\s+(une?\s+)?(image|photo|portrait|illustration)/i,
  /fait?\s+(une?\s+)?(image|photo|logo|affiche|portrait)/i,
  /produi[st]\s+(une?\s+)?(image|illustration)/i,
  /\b(image|photo|portrait|illustration|logo)\s+d(e\s+)?/i,
  /visualise?\s+(une?\s+)?(image|scène|situation)/i,
  /montre[- ]moi\s+(une?\s+)?(image|photo|ce que)/i,
]

// ─── Mots d'actualité (OBLIGATOIREMENT recherche web) ─────────────────────
const NEWS_KEYWORDS = [
  'président actuel', 'actuel président', 'président du', 'chef d\'état',
  'chef de l\'état', 'premier ministre', 'ministre actuel', 'gouvernement actuel',
  'maire de', 'gouverneur de', 'directeur de', 'pdg de', 'ceo de',
  'score du match', 'résultat du match', 'qui a gagné', 'vainqueur',
  'météo', 'température', 'prévisions',
  'prix du', 'taux de', 'cours du', 'valeur du', 'cotation',
  'élections', 'résultats des élections', 'sondage', 'opinion',
  'aujourd\'hui', 'actuellement', 'en ce moment', 'cette année', 'cette semaine',
  'dernières nouvelles', 'breaking news', 'à l\'heure actuelle', 'en 2025', 'en 2026',
  'quoi de neuf', 'nouvelles', 'recent', 'dernier',
  'classement', 'ranking', 'palmarès',
  'quand', 'date de', 'horaire',
]
const NEWS_PATTERNS = [
  /qui\s+(est|sont)\s+(le|la|les)\s+.+\s+(actuel|en\s+fonction|aujourd'hui)/i,
  /quel\s+(est|est\s+le)\s+(le\s+)?(nouveau|dernier|actuel)/i,
  /combien\s+(coûte|coute|vaut|est)\s+.+/i,
  /quel\s+(est\s+le\s+)?(prix|taux|cours|score|résultat)\s+(du|de|des)/i,
]

// ─── Contestations utilisateur ─────────────────────────────────────────────
const CONTESTATION_PATTERNS = [
  /\b(c'est\s+pas?\s+(juste|vrai|correct)|ce\s+n'est\s+pas?\s+(juste|vrai|correct))\b/i,
  /\b(réponse?\s+(fausse|incorrecte|erronée|mauvaise))\b/i,
  /\b(tu\s+te\s+trompes?|tu\s+as\s+tor?t|se\s+trompe)\b/i,
  /\b(faux|incorrect|erroné|trompeur|mensonger?)\b/i,
  /\b(vérifie?\s+(encore|autre\s+fois|ça|cela| mieux))\b/i,
  /\b(réessaie?\s+(encore|avec\s+d'autres?\s+(sources?|modèles?)))\b/i,
  /\b(non\s+,\s*(c'est|ça|cela|pas)\s)/i,
  /\b(pas?\s+d'accord|je\s+ne\s+suis?\s+pas?\s+d'accord)\b/i,
]

// ─── Parsing principal ─────────────────────────────────────────────────────
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
export function parseQuery(message: string): ParsedQuery {
  const text = message.trim()
  if (!text) throw new Error('Message vide')

<<<<<<< HEAD
  const intent = detectIntent(text)
  const language = detectLanguage(text)
  const requiresWeb = detectWebNeed(text, intent)
  const urgency = detectUrgency(text)
  const complexity = detectComplexity(text)

  return { text, intent, language, requiresWeb, urgency, complexity }
}

=======
  const isImageRequest = detectImageRequest(text)
  const isContestation = detectContestation(text)
  const isNewsQuery = detectNewsQuery(text)
  const intent = isImageRequest ? 'image_generation' : detectIntent(text)
  const language = detectLanguage(text)
  const requiresWeb = isNewsQuery || detectWebNeed(text, intent) || isContestation
  const urgency = detectUrgency(text)
  const complexity = detectComplexity(text)

  return { text, intent, language, requiresWeb, isNewsQuery, isImageRequest, isContestation, urgency, complexity }
}

// ─── Détection d'image ────────────────────────────────────────────────────
function detectImageRequest(text: string): boolean {
  const lower = text.toLowerCase()

  // Vérifier les patterns regex en premier (plus précis)
  if (IMAGE_PATTERNS.some(p => p.test(text))) return true

  // Puis les verbes
  if (IMAGE_VERBS.some(v => lower.includes(v))) return true

  // Puis les noms
  if (IMAGE_NOUNS.some(n => lower.includes(n))) return true

  return false
}

// ─── Détection d'actualité ─────────────────────────────────────────────────
function detectNewsQuery(text: string): boolean {
  const lower = text.toLowerCase()

  if (NEWS_PATTERNS.some(p => p.test(text))) return true
  if (NEWS_KEYWORDS.some(kw => lower.includes(kw))) return true

  return false
}

// ─── Détection de contestation ─────────────────────────────────────────────
export function detectContestation(text: string): boolean {
  return CONTESTATION_PATTERNS.some(p => p.test(text))
}

// ─── Détection d'intention ────────────────────────────────────────────────
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
function detectIntent(text: string): QueryIntent {
  const lower = text.toLowerCase()
  let bestIntent: QueryIntent = 'general'
  let bestScore = 0

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [QueryIntent, string[]][]) {
<<<<<<< HEAD
    if (intent === 'general') continue
=======
    if (intent === 'general' || intent === 'image_generation') continue
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
    const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0)
    if (score > bestScore) {
      bestScore = score
      bestIntent = intent
    }
  }

  return bestIntent
}

<<<<<<< HEAD
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

=======
// ─── Détection de langue ──────────────────────────────────────────────────
function detectLanguage(text: string): string {
  const frenchPatterns = /[àâäéèêëïîôùûüÿçœæ]|le |la |les |de |des |du |un |une |est |sont |pour |avec |dans |que |qui |sur |ce |ne |pas |aussi |très |fait |être |avoir/
  return frenchPatterns.test(text.toLowerCase()) ? 'fr' : 'en'
}

// ─── Détection besoin web ─────────────────────────────────────────────────
function detectWebNeed(text: string, intent: QueryIntent): boolean {
  const lower = text.toLowerCase()
  const webTriggers = ['recherche', 'search', 'trouve', 'find', 'dernières', 'actualité', 'news', 'récent', 'étude', 'rapport', 'source', 'référence', 'vidéo', 'youtube', 'tutorial', 'tuto', 'sur internet']
  if (webTriggers.some(t => lower.includes(t))) return true
  if (intent === 'research') return true
  const factualPatterns = [/combien\s+(coûte|est|vaut)/i, /quel\s+(est|est\s+le)\s+(prix|taux|cours|score)/i, /météo/i, /cours\s+de/i]
  return factualPatterns.some(p => p.test(lower))
}

// ─── Détection urgence ────────────────────────────────────────────────────
function detectUrgency(text: string): 'low' | 'medium' | 'high' {
  const lower = text.toLowerCase()
  if (/urgent|vite|répide|immédiat|asap/i.test(lower)) return 'high'
  if (/détaille|complet|approfondi|en profondeur|thorough|exhaustif/i.test(lower)) return 'low'
  return 'medium'
}

// ─── Détection complexité ─────────────────────────────────────────────────
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
function detectComplexity(text: string): 'simple' | 'moderate' | 'complex' {
  const wordCount = text.split(/\s+/).length
  if (wordCount < 10) return 'simple'
  if (wordCount < 30) return 'moderate'
<<<<<<< HEAD
  // Vérifie s'il y a des demandes multi-parties
=======
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
  const hasMultipleParts = (text.match(/[.?!\n]/g) || []).length > 2
  return hasMultipleParts ? 'complex' : 'moderate'
}

<<<<<<< HEAD
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
export function selectProviders(query: ParsedQuery, strategy: QueryStrategy): AIProvider[] {
  const { intent, language, urgency } = query

  // Score chaque provider
  const scored = (Object.entries(AI_PROFILES) as [AIProvider, typeof AI_PROFILES[AIProvider]][])
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
=======
// ─── Décision de stratégie ────────────────────────────────────────────────
export function decideStrategy(query: ParsedQuery): QueryStrategy {
  // Image → génération d'image
  if (query.isImageRequest) return 'image_generation'

  // Actualité ou contestation → obligatoirement IA + Web
  if (query.isNewsQuery || query.isContestation) return 'ai_plus_web'

  // Web requis → IA + Web
  if (query.requiresWeb) return 'ai_plus_web'

  // Complexe ou comparaison → Multi-IA
  if (query.complexity === 'complex') return 'multi_ai'
  const lower = query.text.toLowerCase()
  if (/compar|différence|versus|vs|meilleur entre|qui est meilleur/i.test(lower)) return 'multi_ai'

  return 'single_ai'
}

// ─── Sélection intelligente des providers ─────────────────────────────────
export function selectProviders(query: ParsedQuery, strategy: QueryStrategy): string[] {
  const { intent, language, urgency, isImageRequest, isNewsQuery, isContestation } = query

  // Pour les images, on ne sélectionne pas de providers textuels
  if (isImageRequest) return ['pollinations']

  // Pour l'actualité et contestations, prioriser qualité + multi-sources
  if (isNewsQuery || isContestation) {
    return selectByQuality(3, language, intent, urgency)
  }

  if (strategy === 'multi_ai') {
    return selectByQuality(3, language, intent, urgency)
  }

  if (strategy === 'ai_plus_web') {
    return selectByQuality(2, language, intent, urgency)
  }

  // Single AI — meilleur provider pour l'intention
  return selectByQuality(1, language, intent, urgency)
}

// Sélection par qualité : priorise les providers les plus fiables
function selectByQuality(count: number, language: string, intent: QueryIntent, urgency: 'low' | 'medium' | 'high'): string[] {
  const scored = Object.entries(AI_PROFILES)
    .filter(([id]) => id !== 'pollinations') // Pas de modèle gratuit pour les requêtes sérieuses
    .map(([id, profile]) => {
      let score = 0

      // Qualité globale (facteur principal)
      score += (profile.quality || 3) * 10

      // Correspondance intention
      if (profile.strengths.includes(intent)) score += 15

      // Langue
      if (profile.languages.includes(language)) score += 8

      // Vitesse si urgent
      if (urgency === 'high') score += profile.speed * 2
      if (urgency === 'low') score += (6 - profile.speed) * 2

>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
      return { id, score }
    })
    .sort((a, b) => b.score - a.score)

<<<<<<< HEAD
  if (strategy === 'single_ai') {
    return [scored[0].id]
  }

  // Multi-IA ou AI+Web : prendre les 2-3 meilleurs
  const count = Math.min(strategy === 'multi_ai' ? 3 : 1, scored.length)
  return scored.slice(0, count).map(s => s.id)
}

// Sélectionne le provider principal pour une requête simple
export function selectPrimaryProvider(query: ParsedQuery): AIProvider {
=======
  return scored.slice(0, count).map(s => s.id)
}

export function selectPrimaryProvider(query: ParsedQuery): string {
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
  return selectProviders(query, 'single_ai')[0]
}