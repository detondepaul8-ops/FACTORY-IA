// GET /api/admin/users — Lister tous les utilisateurs (admin)
// POST /api/admin/users — Créer un utilisateur (admin)
// PATCH /api/admin/users — Modifier un utilisateur (admin)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromToken, hashPassword } from '@/lib/auth/utils'

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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''

    const where = search
      ? { OR: [{ email: { contains: search } }, { name: { contains: search } }] }
      : {}

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          credits: true,
          plan: true,
          isActive: true,
          createdAt: true,
          _count: { select: { apiKeys: true, queryLogs: true, creditTransactions: true } },
        },
      }),
      db.user.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: { users, total, page, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('[Admin Users] Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await adminAuth(request)
    if (!admin) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

    const body = await request.json()
    const { userId, credits, role, plan, isActive } = body

    if (!userId) return NextResponse.json({ error: 'userId requis.' }, { status: 400 })

    const updateData: Record<string, unknown> = {}
    if (credits !== undefined) updateData.credits = credits
    if (role) updateData.role = role
    if (plan) updateData.plan = plan
    if (isActive !== undefined) updateData.isActive = isActive

    const user = await db.user.update({
      where: { id: userId },
      data: updateData,
    })

    // Si des crédits bonus sont ajoutés
    if (credits && credits > 0) {
      const current = await db.user.findUnique({ where: { id: userId } })
      const bonus = credits - (current?.credits || 0)
      if (bonus > 0) {
        await db.creditTransaction.create({
          data: {
            userId,
            amount: bonus,
            type: 'admin_bonus',
            description: `Bonus crédits par admin (${admin.name})`,
          },
        })
      }
    }

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error('[Admin Users PATCH] Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await adminAuth(request)
    if (!admin) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

    const body = await request.json()
    const { email, name, password, role, credits, plan } = body

    if (!email || !name || !password) {
      return NextResponse.json({ error: 'email, name, password requis.' }, { status: 400 })
    }

    const hashedPassword = await hashPassword(password)

    const user = await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role || 'user',
        credits: credits || 50,
        plan: plan || 'free',
      },
    })

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error('[Admin Users POST] Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}