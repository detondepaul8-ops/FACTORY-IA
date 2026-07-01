// AI Core Engine — Types du cerveau de FACTORY IA

export type AIProvider = 'gemini' | 'claude' | 'deepseek' | 'mistral' | 'groq' | 'huggingface' | 'openrouter' | 'openai' | 'cloudflare' | 'pollinations'
export type QueryStrategy = 'single_ai' | 'multi_ai' | 'ai_plus_web' | 'image_generation'

export type QueryIntent =
  | 'code'
  | 'writing'
  | 'analysis'
  | 'translation'
  | 'research'
  | 'math'
  | 'creative'
  | 'image_generation'
  | 'general'

export interface ParsedQuery {
  text: string
  intent: QueryIntent
  language: string
  requiresWeb: boolean
  isNewsQuery: boolean       // Demande une info temporelle
  isImageRequest: boolean    // Demande de génération d'image
  isContestation: boolean    // L'utilisateur conteste une réponse
  urgency: 'low' | 'medium' | 'high'
  complexity: 'simple' | 'moderate' | 'complex'
}

export interface AIResponse {
  provider: string
  content: string
  model: string
  latency: number
  tokens?: number
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
  aiModelsUsed: string[]
  webSources: WebSource[]
  totalLatency: number
  creditsCost: number
  qualityScore?: ResponseScore
  wasRetried?: boolean
}

// Profils des IA — quand les utiliser
export const AI_PROFILES: Record<string, {
  name: string
  strengths: QueryIntent[]
  languages: string[]
  speed: number
  model: string
  quality: number  // 1-5 score de qualité global
}> = {
  gemini: {
    name: 'Google Gemini',
    strengths: ['general', 'analysis', 'research', 'math', 'translation', 'code'],
    languages: ['fr', 'en', 'de', 'es', 'zh', 'ja'],
    speed: 3,
    model: 'gemini-2.5-flash',
    quality: 5,
  },
  claude: {
    name: 'Anthropic Claude',
    strengths: ['writing', 'analysis', 'creative', 'translation'],
    languages: ['en', 'fr', 'de', 'es'],
    speed: 2,
    model: 'claude-sonnet-4-20250514',
    quality: 5,
  },
  deepseek: {
    name: 'DeepSeek',
    strengths: ['code', 'math', 'analysis', 'general'],
    languages: ['zh', 'en'],
    speed: 3,
    model: 'deepseek-chat',
    quality: 4,
  },
  mistral: {
    name: 'Mistral AI',
    strengths: ['writing', 'general', 'translation', 'creative', 'analysis'],
    languages: ['fr', 'en', 'de', 'es', 'it'],
    speed: 4,
    model: 'mistral-large-latest',
    quality: 4,
  },
  groq: {
    name: 'Groq',
    strengths: ['code', 'general', 'math'],
    languages: ['en', 'fr'],
    speed: 5,
    model: 'llama-3.3-70b-versatile',
    quality: 3,
  },
  huggingface: {
    name: 'HuggingFace',
    strengths: ['code', 'general', 'creative'],
    languages: ['en', 'fr'],
    speed: 2,
    model: 'mistralai/Mistral-7B-Instruct-v0.3',
    quality: 2,
  },
  openrouter: {
    name: 'OpenRouter',
    strengths: ['general', 'code', 'writing', 'analysis'],
    languages: ['en', 'fr', 'de', 'es'],
    speed: 3,
    model: 'anthropic/claude-sonnet-4-20250514',
    quality: 5,
  },
  openai: {
    name: 'OpenAI',
    strengths: ['writing', 'analysis', 'code', 'creative', 'general'],
    languages: ['en', 'fr', 'de', 'es'],
    speed: 3,
    model: 'gpt-4o-mini',
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
  gemini: 'Gemini',
  claude: 'Claude',
  deepseek: 'DeepSeek',
  mistral: 'Mistral',
  groq: 'Groq',
  huggingface: 'HuggingFace',
  openrouter: 'OpenRouter',
  openai: 'OpenAI',
  cloudflare: 'Cloudflare Workers AI',
  pollinations: 'Pollinations AI',
}

// Coûts en crédits par stratégie
export const CREDITS_COST: Record<QueryStrategy, number> = {
  single_ai: 1,
  multi_ai: 3,
  ai_plus_web: 2,
  image_generation: 1,
}