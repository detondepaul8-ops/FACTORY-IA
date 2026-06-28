// Export principal du module AI Core
export { processQuery } from './engine'
export { parseQuery, decideStrategy, selectProviders, selectPrimaryProvider } from './router'
export { compareResponses } from './compare'
export { AI_PROFILES, CREDITS_COST } from './types'
export type { AIProvider, QueryStrategy, QueryIntent, ParsedQuery, AIResponse, WebSource, FinalResponse } from './types'