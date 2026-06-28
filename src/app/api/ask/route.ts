// POST /api/ask — Le point d'entrée principal de FACTORY IA
import { NextRequest, NextResponse } from 'next/server'
import { processQuery } from '@/lib/ai-core'
import { db } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le message est requis.' },
        { status: 400 }
      )
    }

    // Authentification optionnelle (via header ou body)
    let userId: string | undefined
    const authHeader = request.headers.get('authorization')
    const apiHeader = request.headers.get('x-api-key')

    // 1. Via Authorization header (utilisateur connecté)
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const user = await getUserFromToken(token)
      if (user) userId = user.id
    }

    // 2. Via X-API-Key header (clé API)
    if (!userId && apiHeader) {
      const apiKey = await db.apiKey.findUnique({
        where: { key: apiHeader },
        include: { user: true },
      })
      if (apiKey && apiKey.isActive) {
        userId = apiKey.user.id
      }
    }

    // 3. Via body.apiKey
    if (!userId && body.apiKey) {
      const apiKey = await db.apiKey.findUnique({
        where: { key: body.apiKey },
        include: { user: true },
      })
      if (apiKey && apiKey.isActive) {
        userId = apiKey.user.id
      }
    }

    // Vérifier les crédits si utilisateur identifié
    if (userId) {
      const user = await db.user.findUnique({ where: { id: userId } })
      if (user && user.credits < 1) {
        return NextResponse.json(
          { error: 'Crédits insuffisants. Veuillez recharger votre compte.' },
          { status: 402 }
        )
      }
    }

    // Traiter la requête avec l'AI Core Engine
    const result = await processQuery(message, userId)

    // Déduire les crédits
    if (userId) {
      await db.$transaction([
        db.user.update({
          where: { id: userId },
          data: { credits: { decrement: result.creditsCost } },
        }),
        db.creditTransaction.create({
          data: {
            userId,
            amount: -result.creditsCost,
            type: 'consumption',
            description: `Requête IA (${result.strategy}) - ${result.aiModelsUsed.join(', ')}`,
          },
        }),
        db.queryLog.create({
          data: {
            userId,
            message: message.substring(0, 2000),
            response: result.content.substring(0, 5000),
            strategy: result.strategy,
            aiModelsUsed: JSON.stringify(result.aiModelsUsed),
            webSources: result.webSources.length > 0 ? JSON.stringify(result.webSources) : null,
            creditsCost: result.creditsCost,
            responseTime: result.totalLatency,
          },
        }),
      ])
    }

    return NextResponse.json({
      success: true,
      data: {
        response: result.content,
        strategy: result.strategy,
        aiModelsUsed: result.aiModelsUsed,
        webSources: result.webSources,
        creditsCost: result.creditsCost,
        latency: result.totalLatency,
      },
    })
  } catch (error) {
    console.error('[API /ask] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur.' },
      { status: 500 }
    )
  }
}

// GET /api/ask — Info sur l'API
export async function GET() {
  return NextResponse.json({
    name: 'FACTORY IA API',
    version: '1.0.0',
    endpoints: {
      ask: 'POST /api/ask',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
      },
      keys: 'GET/POST /api/keys',
      credits: 'GET /api/credits',
    },
    aiProviders: ['gemini', 'claude', 'deepseek', 'mistral', 'groq'],
    strategies: ['single_ai', 'multi_ai', 'ai_plus_web'],
  })
}