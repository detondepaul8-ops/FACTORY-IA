// ─── Provider Registry ────────────────────────────────────────────────────────
// Système centralisé et sécurisé de gestion des fournisseurs IA

import { db } from '@/lib/db'

// Types publics (sans la clé API)
export interface ProviderPublic {
  id: string
  slug: string
  name: string
  description: string
  defaultModel: string
  apiType: string
  isActive: boolean
  priority: number
  strengths: string[]
  languages: string[]
  speed: number
  healthStatus: 'healthy' | 'unhealthy' | 'unknown'
  lastHealthCheck: Date | null
  totalCalls: number
  successCalls: number
  failedCalls: number
  avgLatencyMs: number
  lastError: string | null
  lastErrorAt: Date | null
  createdAt: Date
}

// Type interne (avec clé déchiffrée, serveur uniquement)
export interface ProviderInternal {
  id: string
  slug: string
  name: string
  description: string
  baseUrl: string
  defaultModel: string
  apiType: string
  authHeader: string
  authPrefix: string
  isActive: boolean
  priority: number
  strengths: string[]
  languages: string[]
  speed: number
  apiKey: string
  healthStatus: string
}

// Cache en mémoire pour éviter de lire la DB à chaque requête
let providerCache: ProviderInternal[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 30_000 // 30 secondes

export function encryptKey(key: string): string {
  return Buffer.from(key).toString('base64')
}

export function decryptKey(encrypted: string): string {
  return Buffer.from(encrypted, 'base64').toString('utf-8')
}

// Charger tous les fournisseurs actifs depuis la DB (avec cache)
export async function getActiveProviders(): Promise<ProviderInternal[]> {
  const now = Date.now()
  if (providerCache && now - cacheTimestamp < CACHE_TTL) {
    return providerCache.filter(p => p.isActive && p.apiKey)
  }

  try {
    const providers = await db.aIProvider.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
    })

    providerCache = providers
      .map(p => {
        let apiKey = ''
        try {
          apiKey = p.apiKeyEncrypted ? decryptKey(p.apiKeyEncrypted) : ''
        } catch {
          apiKey = ''
        }

        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          description: p.description,
          baseUrl: p.baseUrl,
          defaultModel: p.defaultModel,
          apiType: p.apiType,
          authHeader: p.authHeader || 'Authorization',
          authPrefix: p.authPrefix || 'Bearer ',
          isActive: p.isActive,
          priority: p.priority,
          strengths: JSON.parse(p.strengths || '[]'),
          languages: JSON.parse(p.languages || '[]'),
          speed: p.speed,
          apiKey,
          healthStatus: p.healthStatus,
        }
      })
      .filter(p => {
        // Pollinations et autres providers gratuits n'ont pas besoin de clé
        if (p.slug === 'pollinations') return p.isActive
        return !!p.apiKey
      })

    cacheTimestamp = now
    return providerCache
  } catch (error) {
    console.error('[Registry] Erreur de lecture DB:', error)
    // Retourner le cache expiré si disponible
    if (providerCache) {
      return providerCache.filter(p => p.isActive && p.apiKey)
    }
    return []
  }
}

// Invalider le cache
export function invalidateProviderCache(): void {
  providerCache = null
  cacheTimestamp = 0
}

// Obtenir un fournisseur par slug
export async function getProvider(slug: string): Promise<ProviderInternal | null> {
  const providers = await getActiveProviders()
  return providers.find(p => p.slug === slug) || null
}

// Vérifier si un provider est disponible
// ⚠️ Plus de blocage sur healthStatus — on laisse l'appel échouer naturellement
export async function isProviderAvailable(slug: string): Promise<boolean> {
  const provider = await getProvider(slug)
  return !!provider && !!provider.apiKey
}

// Mettre à jour les stats d'un fournisseur après un appel
export async function recordProviderCall(
  slug: string,
  success: boolean,
  latencyMs: number,
  errorMessage?: string
): Promise<void> {
  try {
    const provider = await db.aIProvider.findUnique({ where: { slug } })
    if (!provider) return

    const newData: Record<string, unknown> = {
      totalCalls: { increment: 1 },
      successCalls: success ? { increment: 1 } : undefined,
      failedCalls: success ? undefined : { increment: 1 },
      lastError: success ? null : (errorMessage || 'Erreur inconnue').substring(0, 500),
      lastErrorAt: success ? null : new Date(),
      updatedAt: new Date(),
    }
    Object.keys(newData).forEach(k => newData[k] === undefined && delete newData[k])

    const totalCalls = provider.totalCalls + 1
    const currentAvg = provider.avgLatencyMs
    const newAvg = Math.round((currentAvg * provider.totalCalls + latencyMs) / totalCalls)

    await db.aIProvider.update({
      where: { slug },
      data: {
        ...newData,
        avgLatencyMs: newAvg,
        // Mettre à jour le health status
        healthStatus: success ? 'healthy' : 'unhealthy',
        lastHealthCheck: new Date(),
      },
    })

    // Enregistrer l'erreur si échec
    if (!success && errorMessage) {
      try {
        await db.providerErrorLog.create({
          data: {
            providerId: provider.id,
            errorMessage: errorMessage.substring(0, 2000),
            errorCode: extractErrorCode(errorMessage),
          },
        })
      } catch {
        // Ignorer les erreurs de logging
      }
    }

    invalidateProviderCache()
  } catch (error) {
    console.error(`[Registry] Erreur recordProviderCall(${slug}):`, error)
  }
}

function extractErrorCode(message: string): string {
  const match = message.match(/error\s+(\d{3})/i)
  return match ? match[1] : 'UNKNOWN'
}

// Health check d'un fournisseur
export async function healthCheck(slug: string): Promise<{
  status: 'healthy' | 'unhealthy'
  message: string
  latency: number
}> {
  const provider = await getProvider(slug)
  if (!provider) {
    return { status: 'unhealthy', message: 'Fournisseur non trouvé', latency: 0 }
  }

  const start = Date.now()
  try {
    let healthy = false
    let message = ''

    if (provider.apiType === 'gemini') {
      const url = `${provider.baseUrl}?key=${provider.apiKey}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'ping' }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
        signal: AbortSignal.timeout(10000),
      })
      healthy = res.ok
      message = healthy ? 'Connectivité OK' : `Erreur HTTP ${res.status}`
    } else {
      const modelsUrl = provider.baseUrl.replace(/\/chat\/completions.*$/, '/models').replace(/\/ai\/run\/.*$/, '')
      const authValue = provider.authPrefix + provider.apiKey

      if (modelsUrl !== provider.baseUrl) {
        const res = await fetch(modelsUrl, {
          method: 'GET',
          headers: { 'Authorization': authValue },
          signal: AbortSignal.timeout(10000),
        })
        if (res.ok) {
          healthy = true
          message = 'Connectivité OK (models)'
        }
      }

      if (!healthy) {
        const chatRes = await fetch(provider.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authValue,
          },
          body: JSON.stringify({
            model: provider.defaultModel,
            messages: [{ role: 'user', content: 'hi' }],
            max_tokens: 1,
          }),
          signal: AbortSignal.timeout(10000),
        })
        healthy = chatRes.ok
        message = healthy ? 'Connectivité OK (chat)' : `Erreur HTTP ${chatRes.status}`
      }
    }

    const latency = Date.now() - start

    await db.aIProvider.update({
      where: { slug },
      data: {
        healthStatus: healthy ? 'healthy' : 'unhealthy',
        lastHealthCheck: new Date(),
        updatedAt: new Date(),
      },
    }).catch(() => {})

    invalidateProviderCache()

    return { status: healthy ? 'healthy' : 'unhealthy', message, latency }
  } catch (error) {
    const latency = Date.now() - start
    const message = error instanceof Error ? error.message : 'Erreur inconnue'

    await db.aIProvider.update({
      where: { slug },
      data: {
        healthStatus: 'unhealthy',
        lastHealthCheck: new Date(),
        updatedAt: new Date(),
      },
    }).catch(() => {})

    invalidateProviderCache()

    return { status: 'unhealthy', message, latency }
  }
}

// Health check de tous les fournisseurs
export async function healthCheckAll(): Promise<Record<string, {
  status: string
  message: string
  latency: number
}>> {
  const providers = await db.aIProvider.findMany({
    select: { slug: true },
  })

  const results: Record<string, { status: string; message: string; latency: number }> = {}

  await Promise.allSettled(
    providers.map(async (p) => {
      const result = await healthCheck(p.slug)
      results[p.slug] = result
    })
  )

  return results
}

// Convertir un provider DB en format public
export function toPublic(p: {
  id: string
  slug: string
  name: string
  description: string
  defaultModel: string
  apiType: string
  isActive: boolean
  priority: number
  strengths: string
  languages: string
  speed: number
  healthStatus: string
  lastHealthCheck: Date | null
  totalCalls: number
  successCalls: number
  failedCalls: number
  avgLatencyMs: number
  lastError: string | null
  lastErrorAt: Date | null
  createdAt: Date
}): ProviderPublic {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    defaultModel: p.defaultModel,
    apiType: p.apiType,
    isActive: p.isActive,
    priority: p.priority,
    strengths: JSON.parse(p.strengths || '[]'),
    languages: JSON.parse(p.languages || '[]'),
    speed: p.speed,
    healthStatus: p.healthStatus as 'healthy' | 'unhealthy' | 'unknown',
    lastHealthCheck: p.lastHealthCheck,
    totalCalls: p.totalCalls,
    successCalls: p.successCalls,
    failedCalls: p.failedCalls,
    avgLatencyMs: p.avgLatencyMs,
    lastError: p.lastError,
    lastErrorAt: p.lastErrorAt,
    createdAt: p.createdAt,
  }
}