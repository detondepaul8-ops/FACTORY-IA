// Export principal du module AI Core
export { processQuery } from './engine'
<<<<<<< HEAD
export { parseQuery, decideStrategy, selectProviders, selectPrimaryProvider } from './router'
export { compareResponses } from './compare'
export { AI_PROFILES, CREDITS_COST } from './types'
export type { AIProvider, QueryStrategy, QueryIntent, ParsedQuery, AIResponse, WebSource, FinalResponse } from './types'
=======
export { parseQuery, decideStrategy, selectProviders, selectPrimaryProvider, detectContestation } from './router'
export { scoreResponse, checkConsistency, selectBestResponse } from './quality-gate'
export { AI_PROFILES, CREDITS_COST } from './types'
export type { AIProvider, QueryStrategy, QueryIntent, ParsedQuery, AIResponse, WebSource, FinalResponse, ResponseScore, QualityResult } from './types'
>>>>>>> 193a7f0736ab7f89bd2ff817723055c019ba95b3
