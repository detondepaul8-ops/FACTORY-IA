// AI Core Engine — Le cerveau de FACTORY IA
// Orchestration multi-IA avec routage intelligent

export type AIProvider = 'gemini' | 'claude' | 'deepseek' | 'mistral' | 'groq' | 'huggingface' | 'openrouter' | 'openai' | 'zai'
export type QueryStrategy = 'single_ai' | 'multi_ai' | 'ai_plus_web'

export type QueryIntent =
  | 'code'
  | 'writing'
  | 'analysis'
  | 'translation'
  | 'research'
  | 'math'
  | 'creative'
  | 'general'

export interface ParsedQuery {
  text: string
  intent: QueryIntent
  language: string
  requiresWeb: boolean
  urgency: 'low' | 'medium' | 'high'
  complexity: 'simple' | 'moderate' | 'complex'
}

export interface AIResponse {
  provider: AIProvider
  content: string
  model: string
  latency: number
  tokens?: number
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
  aiModelsUsed: AIProvider[]
  webSources: WebSource[]
  totalLatency: number
  creditsCost: number
}

// Profils des IA — quand les utiliser
export const AI_PROFILES: Record<AIProvider, {
  name: string
  strengths: QueryIntent[]
  languages: string[]
  speed: number
  model: string
}> = {
  gemini: {
    name: 'Google Gemini',
    strengths: ['general', 'analysis', 'research', 'math', 'translation'],
    languages: ['fr', 'en', 'de', 'es', 'zh', 'ja'],
    speed: 3,
    model: 'gemini-2.5-flash',
  },
  claude: {
    name: 'Anthropic Claude',
    strengths: ['writing', 'analysis', 'creative', 'translation'],
    languages: ['en', 'fr', 'de', 'es'],
    speed: 2,
    model: 'claude-sonnet-4-20250514',
  },
  deepseek: {
    name: 'DeepSeek',
    strengths: ['code', 'math', 'analysis', 'general'],
    languages: ['zh', 'en'],
    speed: 3,
    model: 'deepseek-chat',
  },
  mistral: {
    name: 'Mistral AI',
    strengths: ['writing', 'general', 'translation', 'creative'],
    languages: ['fr', 'en', 'de', 'es', 'it'],
    speed: 4,
    model: 'mistral-large-latest',
  },
  groq: {
    name: 'Groq',
    strengths: ['code', 'general', 'math'],
    languages: ['en'],
    speed: 5,
    model: 'llama-3.3-70b-versatile',
  },
  huggingface: {
    name: 'HuggingFace',
    strengths: ['code', 'general', 'creative'],
    languages: ['en', 'fr'],
    speed: 2,
    model: 'mistralai/Mistral-7B-Instruct-v0.3',
  },
  openrouter: {
    name: 'OpenRouter',
    strengths: ['general', 'code', 'writing', 'analysis'],
    languages: ['en', 'fr', 'de', 'es'],
    speed: 3,
    model: 'anthropic/claude-sonnet-4-20250514',
  },
  openai: {
    name: 'OpenAI',
    strengths: ['writing', 'analysis', 'code', 'creative', 'general'],
    languages: ['en', 'fr', 'de', 'es'],
    speed: 3,
    model: 'gpt-4o-mini',
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
  gemini: 'Gemini',
  claude: 'Claude',
  deepseek: 'DeepSeek',
  mistral: 'Mistral',
  groq: 'Groq',
  huggingface: 'HuggingFace',
  openrouter: 'OpenRouter',
  openai: 'OpenAI',
  zai: 'Z IA',
}

// Coûts en crédits par stratégie
export const CREDITS_COST: Record<QueryStrategy, number> = {
  single_ai: 1,
  multi_ai: 3,
  ai_plus_web: 2,
}