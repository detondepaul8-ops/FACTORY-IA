// GET /api/admin/stats — Statistiques globales (admin)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

    const token = authHeader.replace('Bearer ', '')
    const admin = await getUserFromToken(token)
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

    const [
      totalUsers,
      totalQueries,
      totalApiKeys,
      activeUsers,
      consumedCredits,
      recentQueries,
      usersByPlan,
    ] = await Promise.all([
      db.user.count(),
      db.queryLog.count(),
      db.apiKey.count(),
      db.user.count({ where: { isActive: true } }),
      db.creditTransaction.aggregate({
        where: { amount: { lt: 0 } },
        _sum: { amount: true },
      }),
      db.queryLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          message: true,
          strategy: true,
          aiModelsUsed: true,
          responseTime: true,
          creditsCost: true,
          createdAt: true,
        },
      }),
      db.user.groupBy({
        by: ['plan'],
        _count: { plan: true },
      }),
    ])

    // Stats par stratégie
    const strategyStats = await db.queryLog.groupBy({
      by: ['strategy'],
      _count: { strategy: true },
      _avg: { responseTime: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          totalQueries,
          totalApiKeys,
          totalCreditsConsumed: Math.abs(consumedCredits._sum.amount || 0),
        },
        byStrategy: strategyStats.map(s => ({
          strategy: s.strategy,
          count: s._count.strategy,
          avgResponseTime: Math.round(s._avg.responseTime || 0),
        })),
        byPlan: usersByPlan.map(p => ({
          plan: p.plan,
          count: p._count.plan,
        })),
        recentQueries,
      },
    })
  } catch (error) {
    console.error('[Admin Stats] Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}