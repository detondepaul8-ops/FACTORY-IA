<<<<<<< HEAD
// AI Core Engine — Le cerveau de FACTORY IA
// Orchestration multi-IA avec routage intelligent

export type AIProvider = 'gemini' | 'claude' | 'deepseek' | 'mistral' | 'groq' | 'huggingface' | 'openrouter' | 'openai' | 'zai'
export type QueryStrategy = 'single_ai' | 'multi_ai' | 'ai_plus_web'
=======
// AI Core Engine — Types du cerveau de FACTORY IA

export type AIProvider = 'gemini' | 'claude' | 'deepseek' | 'mistral' | 'groq' | 'huggingface' | 'openrouter' | 'openai' | 'cloudflare' | 'pollinations'
export type QueryStrategy = 'single_ai' | 'multi_ai' | 'ai_plus_web' | 'image_generation'
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3

export type QueryIntent =
  | 'code'
  | 'writing'
  | 'analysis'
  | 'translation'
  | 'research'
  | 'math'
  | 'creative'
<<<<<<< HEAD
=======
  | 'image_generation'
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
  | 'general'

export interface ParsedQuery {
  text: string
  intent: QueryIntent
  language: string
  requiresWeb: boolean
<<<<<<< HEAD
=======
  isNewsQuery: boolean       // Demande une info temporelle
  isImageRequest: boolean    // Demande de génération d'image
  isContestation: boolean    // L'utilisateur conteste une réponse
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
  urgency: 'low' | 'medium' | 'high'
  complexity: 'simple' | 'moderate' | 'complex'
}

export interface AIResponse {
<<<<<<< HEAD
  provider: AIProvider
=======
  provider: string
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
  content: string
  model: string
  latency: number
  tokens?: number
<<<<<<< HEAD
=======
  isError?: boolean
}

export interface ResponseScore {
  relevance: number      // 0-100: répond à la question
  accuracy: number       // 0-100: exactitude
  freshness: number      // 0-100: données récentes
  completeness: number   // 0-100: réponse complète
  presentation: number   // 0-100: qualité de présentation
  total: number          // Moyenne pondérée
}

export interface QualityResult {
  passed: boolean
  score: ResponseScore
  issues: string[]
  suggestion: string
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
}

export interface WebSource {
  title: string
  url: string
  snippet: string
  source: 'google' | 'youtube'
}

export interface FinalResponse {
  content: string
  strategy: QueryStrategy
<<<<<<< HEAD
  aiModelsUsed: AIProvider[]
  webSources: WebSource[]
  totalLatency: number
  creditsCost: number
}

// Profils des IA — quand les utiliser
export const AI_PROFILES: Record<AIProvider, {
=======
  aiModelsUsed: string[]
  webSources: WebSource[]
  totalLatency: number
  creditsCost: number
  qualityScore?: ResponseScore
  wasRetried?: boolean
}

// Profils des IA — quand les utiliser
export const AI_PROFILES: Record<string, {
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
  name: string
  strengths: QueryIntent[]
  languages: string[]
  speed: number
  model: string
<<<<<<< HEAD
}> = {
  gemini: {
    name: 'Google Gemini',
    strengths: ['general', 'analysis', 'research', 'math', 'translation'],
    languages: ['fr', 'en', 'de', 'es', 'zh', 'ja'],
    speed: 3,
    model: 'gemini-2.5-flash',
=======
  quality: number  // 1-5 score de qualité global
}> = {
  gemini: {
    name: 'Google Gemini',
    strengths: ['general', 'analysis', 'research', 'math', 'translation', 'code'],
    languages: ['fr', 'en', 'de', 'es', 'zh', 'ja'],
    speed: 3,
    model: 'gemini-2.5-flash',
    quality: 5,
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
  },
  claude: {
    name: 'Anthropic Claude',
    strengths: ['writing', 'analysis', 'creative', 'translation'],
    languages: ['en', 'fr', 'de', 'es'],
    speed: 2,
    model: 'claude-sonnet-4-20250514',
<<<<<<< HEAD
=======
    quality: 5,
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
  },
  deepseek: {
    name: 'DeepSeek',
    strengths: ['code', 'math', 'analysis', 'general'],
    languages: ['zh', 'en'],
    speed: 3,
    model: 'deepseek-chat',
<<<<<<< HEAD
  },
  mistral: {
    name: 'Mistral AI',
    strengths: ['writing', 'general', 'translation', 'creative'],
    languages: ['fr', 'en', 'de', 'es', 'it'],
    speed: 4,
    model: 'mistral-large-latest',
=======
    quality: 4,
  },
  mistral: {
    name: 'Mistral AI',
    strengths: ['writing', 'general', 'translation', 'creative', 'analysis'],
    languages: ['fr', 'en', 'de', 'es', 'it'],
    speed: 4,
    model: 'mistral-large-latest',
    quality: 4,
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
  },
  groq: {
    name: 'Groq',
    strengths: ['code', 'general', 'math'],
<<<<<<< HEAD
    languages: ['en'],
    speed: 5,
    model: 'llama-3.3-70b-versatile',
=======
    languages: ['en', 'fr'],
    speed: 5,
    model: 'llama-3.3-70b-versatile',
    quality: 3,
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
  },
  huggingface: {
    name: 'HuggingFace',
    strengths: ['code', 'general', 'creative'],
    languages: ['en', 'fr'],
    speed: 2,
    model: 'mistralai/Mistral-7B-Instruct-v0.3',
<<<<<<< HEAD
=======
    quality: 2,
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
  },
  openrouter: {
    name: 'OpenRouter',
    strengths: ['general', 'code', 'writing', 'analysis'],
    languages: ['en', 'fr', 'de', 'es'],
    speed: 3,
    model: 'anthropic/claude-sonnet-4-20250514',
<<<<<<< HEAD
=======
    quality: 5,
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
  },
  openai: {
    name: 'OpenAI',
    strengths: ['writing', 'analysis', 'code', 'creative', 'general'],
    languages: ['en', 'fr', 'de', 'es'],
    speed: 3,
    model: 'gpt-4o-mini',
<<<<<<< HEAD
  },
  zai: {
    name: 'Z IA (GLM-4-Plus)',
    strengths: ['writing', 'analysis', 'code', 'creative', 'general', 'translation', 'math', 'research'],
    languages: ['fr', 'en', 'zh', 'de', 'es', 'ja'],
    speed: 4,
    model: 'glm-4-plus',
  },

// Noms d'affichage
export const PROVIDER_NAMES: Record<AIProvider, string> = {
=======
    quality: 4,
  },
  cloudflare: {
    name: 'Cloudflare Workers AI',
    strengths: ['general', 'code', 'math'],
    languages: ['en', 'fr'],
    speed: 4,
    model: '@cf/meta/llama-3.1-8b-instruct',
    quality: 2,
  },
  pollinations: {
    name: 'Pollinations AI',
    strengths: ['general', 'creative', 'writing'],
    languages: ['en', 'fr', 'de', 'es'],
    speed: 3,
    model: 'openai',
    quality: 3,
  },
}

// Noms d'affichage
export const PROVIDER_NAMES: Record<string, string> = {
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
  gemini: 'Gemini',
  claude: 'Claude',
  deepseek: 'DeepSeek',
  mistral: 'Mistral',
  groq: 'Groq',
  huggingface: 'HuggingFace',
  openrouter: 'OpenRouter',
  openai: 'OpenAI',
<<<<<<< HEAD
  zai: 'Z IA',
=======
  cloudflare: 'Cloudflare Workers AI',
  pollinations: 'Pollinations AI',
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
}

// Coûts en crédits par stratégie
export const CREDITS_COST: Record<QueryStrategy, number> = {
  single_ai: 1,
  multi_ai: 3,
  ai_plus_web: 2,
<<<<<<< HEAD
=======
  image_generation: 1,
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
}