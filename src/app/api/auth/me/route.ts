// GET /api/auth/me — Informations de l'utilisateur connecté
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const user = await getUserFromToken(token)

    if (!user) {
      return NextResponse.json({ error: 'Token invalide.' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        credits: user.credits,
        plan: user.plan,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    console.error('[Me] Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}