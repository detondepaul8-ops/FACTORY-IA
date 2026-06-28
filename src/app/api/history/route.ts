// GET /api/history — Historique des requêtes
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const user = await getUserFromToken(token)
    if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '30')

    const history = await db.queryLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        message: true,
        response: true,
        strategy: true,
        aiModelsUsed: true,
        webSources: true,
        creditsCost: true,
        responseTime: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, data: history })
  } catch (error) {
    console.error('[History] Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}