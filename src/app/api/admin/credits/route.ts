// POST /api/admin/credits — Ajouter des crédits (admin)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth/utils'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

    const token = authHeader.replace('Bearer ', '')
    const admin = await getUserFromToken(token)
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

    const body = await request.json()
    const { userId, amount, description } = body

    if (!userId || !amount) {
      return NextResponse.json({ error: 'userId et amount requis.' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: 'Utilisateur non trouvé.' }, { status: 404 })

    const updatedUser = await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: { credits: { increment: amount } },
      }),
      db.creditTransaction.create({
        data: {
          userId,
          amount,
          type: amount > 0 ? 'admin_bonus' : 'consumption',
          description: description || `Ajustement par admin (${admin.name})`,
        },
      }),
    ])

    return NextResponse.json({ success: true, data: { userId, newCredits: user.credits + amount } })
  } catch (error) {
    console.error('[Admin Credits] Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}