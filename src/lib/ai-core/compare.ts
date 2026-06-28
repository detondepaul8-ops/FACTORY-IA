// Comparaison intelligente des réponses multi-IA
// Sélectionne la meilleure réponse ou les fusionne

import type { AIResponse } from './types'

export interface ComparisonResult {
  bestResponse: AIResponse
  allResponses: AIResponse[]
  reasoning: string
  confidence: number // 0-1
}

export function compareResponses(responses: AIResponse[]): ComparisonResult {
  if (responses.length === 1) {
    return {
      bestResponse: responses[0],
      allResponses: responses,
      reasoning: `Réponse unique de ${responses[0].provider}.`,
      confidence: 0.7,
    }
  }

  // Scorer chaque réponse
  const scored = responses.map(r => ({
    response: r,
    score: scoreResponse(r),
  }))

  scored.sort((a, b) => b.score - a.score)

  const best = scored[0]
  const runner = scored[1]

  // Si les scores sont proches, on peut fusionner des éléments
  let reasoning = ''
  if (scored.length >= 2 && best.score - runner.score < 1.5) {
    reasoning = `Réponses de ${best.response.provider} et ${runner.response.provider} étaient de qualité similaire. `
    reasoning += `La réponse de ${best.response.provider} a été sélectionnée comme base, `
    reasoning += `enrichie des points forts de ${runner.response.provider}.`
    // Fusion simple : prendre la meilleure comme base
    best.response = {
      ...best.response,
      content: mergeResponses(best.response, runner.response),
    }
  } else {
    reasoning = `La réponse de ${best.response.provider} a été clairement identifiée comme la meilleure `
    reasoning += `parmi ${responses.length} modèles testés (score: ${best.score.toFixed(1)}/10).`
  }

  return {
    bestResponse: best.response,
    allResponses: responses,
    reasoning,
    confidence: Math.min(best.score / 10, 1),
  }
}

function scoreResponse(response: AIResponse): number {
  let score = 5 // Base

  const content = response.content

  // Longueur appropriée (pas trop court, pas trop long)
  const wordCount = content.split(/\s+/).length
  if (wordCount >= 20 && wordCount <= 1000) score += 1.5
  else if (wordCount >= 10) score += 0.5
  else score -= 1

  // Structure : présence de sections, listes, titres
  if (/#{1,3}\s/.test(content)) score += 1 // Markdown headers
  if (/[-*]\s/.test(content)) score += 0.5 // Listes
  if (/```/.test(content)) score += 0.5 // Blocs de code
  if (/\d+\.\s/.test(content)) score += 0.3 // Listes numérotées

  // Précision : pas de phrases vides répétées
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 5)
  if (sentences.length >= 3) score += 0.5

  // Bonus qualité par provider
  const providerBonus: Record<string, number> = {
    claude: 1.2,
    gemini: 1.0,
    deepseek: 1.1,
    mistral: 1.0,
    groq: 0.8,
  }
  score *= providerBonus[response.provider] || 1.0

  // Pénalité latence (au-delà de 10s)
  if (response.latency > 10000) score -= 0.5

  return Math.max(1, Math.min(10, score))
}

function mergeResponses(best: AIResponse, runner: AIResponse): string {
  // Stratégie de fusion simple :
  // Prendre la meilleure réponse comme base
  // Ajouter un addendum si le runner a des infos uniques
  const bestContent = best.content.trim()
  const runnerContent = runner.content.trim()

  // Si les réponses sont très similaires, garder la meilleure
  const similarity = simpleSimilarity(bestContent, runnerContent)
  if (similarity > 0.6) return bestContent

  // Sinon, enrichir avec des éléments du runner
  return `${bestContent}\n\n---\n**Contribution supplémentaire (${runner.provider}) :**\n${extractUniquePoints(bestContent, runnerContent)}`
}

function simpleSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/))
  const wordsB = new Set(b.toLowerCase().split(/\s+/))
  let common = 0
  for (const w of wordsA) {
    if (wordsB.has(w)) common++
  }
  return common / Math.max(wordsA.size, wordsB.size)
}

function extractUniquePoints(base: string, addition: string): string {
  // Extraire les phrases de l'addition qui ne sont pas dans la base
  const baseSentences = new Set(
    base.split(/[.!?\n]+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 10)
  )
  const addSentences = addition
    .split(/[.!?\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10 && !baseSentences.has(s.toLowerCase()))

  return addSentences.slice(0, 5).join('. ') + '.'
}