// GET /api/admin/providers/errors — Historique des erreurs fournisseurs
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth/utils'

async function adminAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.replace('Bearer ', '')
  const user = await getUserFromToken(token)
  if (!user || user.role !== 'admin') return null
  return user
}

export async function GET(request: NextRequest) {
  try {
    const admin = await adminAuth(request)
    if (!admin) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('providerId')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where = providerId ? { providerId } : {}

    const errors = await db.providerErrorLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        provider: {
          select: { slug: true, name: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: errors })
  } catch (error) {
    console.error('[Provider Errors] Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}