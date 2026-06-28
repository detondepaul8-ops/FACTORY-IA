// GET /api/credits — Historique des crédits
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request)
    if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const transactions = await db.creditTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true,
      },
    })

    const totalConsumed = await db.creditTransaction.aggregate({
      where: { userId: user.id, amount: { lt: 0 } },
      _sum: { amount: true },
    })

    const totalAdded = await db.creditTransaction.aggregate({
      where: { userId: user.id, amount: { gt: 0 } },
      _sum: { amount: true },
    })

    // Récupérer le solde actuel
    const currentUser = await db.user.findUnique({ where: { id: user.id } })

    return NextResponse.json({
      success: true,
      data: {
        currentCredits: currentUser?.credits || 0,
        totalConsumed: Math.abs(totalConsumed._sum.amount || 0),
        totalAdded: totalAdded._sum.amount || 0,
        transactions,
      },
    })
  } catch (error) {
    console.error('[Credits] Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.replace('Bearer ', '')
  return getUserFromToken(token)
}