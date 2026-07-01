// Export principal du module AI Core
export { processQuery } from './engine'
export { parseQuery, decideStrategy, selectProviders, selectPrimaryProvider, detectContestation } from './router'
export { scoreResponse, checkConsistency, selectBestResponse } from './quality-gate'
export { AI_PROFILES, CREDITS_COST } from './types'
export type { AIProvider, QueryStrategy, QueryIntent, ParsedQuery, AIResponse, WebSource, FinalResponse, ResponseScore, QualityResult } from './types'