// GET /api/keys — Lister les clés API
// POST /api/keys — Créer une clé API
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth/utils'
import { randomBytes } from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request)
    if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

    const keys = await db.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        key: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, data: keys })
  } catch (error) {
    console.error('[Keys GET] Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request)
    if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

    // Limiter à 5 clés par utilisateur (admins exempts)
    const keyCount = await db.apiKey.count({ where: { userId: user.id } })
    const keyLimit = user.role === 'admin' ? 999 : 5
    if (keyCount >= keyLimit) {
      return NextResponse.json(
        { error: user.role === 'admin' ? 'Limite de 999 clés API atteinte.' : 'Limite de 5 clés API atteinte.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const name = body.name || `Clé ${keyCount + 1}`

    const key = `fk_${randomBytes(24).toString('hex')}`

    const apiKey = await db.apiKey.create({
      data: { key, name, userId: user.id },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: apiKey.id,
        key: apiKey.key,
        name: apiKey.name,
        isActive: apiKey.isActive,
        createdAt: apiKey.createdAt,
      },
    })
  } catch (error) {
    console.error('[Keys POST] Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

// DELETE /api/keys — Supprimer une clé
export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticate(request)
    if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('id')
    if (!keyId) return NextResponse.json({ error: 'ID requis.' }, { status: 400 })

    const apiKey = await db.apiKey.findFirst({ where: { id: keyId, userId: user.id } })
    if (!apiKey) return NextResponse.json({ error: 'Clé non trouvée.' }, { status: 404 })

    await db.apiKey.delete({ where: { id: keyId } })

    return NextResponse.json({ success: true, message: 'Clé supprimée.' })
  } catch (error) {
    console.error('[Keys DELETE] Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.replace('Bearer ', '')
  return getUserFromToken(token)
}