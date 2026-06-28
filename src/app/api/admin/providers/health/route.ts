// POST /api/admin/providers/health — Vérifier la santé d'un ou tous les fournisseurs
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth/utils'
import { healthCheck as hc, healthCheckAll, toPublic } from '@/lib/ai-core/providers/registry'

async function adminAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.replace('Bearer ', '')
  const user = await getUserFromToken(token)
  if (!user || user.role !== 'admin') return null
  return user
}

export async function POST(request: NextRequest) {
  try {
    const admin = await adminAuth(request)
    if (!admin) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

    const body = await request.json()
    const { slug, checkAll } = body

    if (checkAll) {
      const results = await healthCheckAll()
      const providers = await db.aIProvider.findMany({ orderBy: { priority: 'desc' } })
      const publicProviders = providers.map(p => ({
        ...toPublic(p),
        healthResult: results[p.slug] || null,
      }))

      return NextResponse.json({ success: true, data: publicProviders })
    }

    if (!slug) {
      return NextResponse.json({ error: 'slug ou checkAll requis.' }, { status: 400 })
    }

    const result = await hc(slug)

    return NextResponse.json({ success: true, data: { slug, ...result } })
  } catch (error) {
    console.error('[Health Check] Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}