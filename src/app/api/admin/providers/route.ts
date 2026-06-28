// GET /api/admin/providers — Lister les fournisseurs (sans clé API !)
// POST /api/admin/providers — Ajouter un fournisseur
// PATCH /api/admin/providers — Modifier un fournisseur
// DELETE /api/admin/providers — Supprimer un fournisseur
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth/utils'
import { encryptKey, toPublic, invalidateProviderCache, healthCheck } from '@/lib/ai-core/providers/registry'
import { z } from 'zod'

async function adminAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.replace('Bearer ', '')
  const user = await getUserFromToken(token)
  if (!user || user.role !== 'admin') return null
  return user
}

// GET — Lister tous les fournisseurs
export async function GET(request: NextRequest) {
  try {
    const admin = await adminAuth(request)
    if (!admin) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

    const providers = await db.aIProvider.findMany({
      orderBy: { priority: 'desc' },
    })

    // Retourner SANS les clés API
    const publicProviders = providers.map(p => ({
      ...toPublic(p),
      apiKeyMasked: p.apiKeyEncrypted ? `${p.apiKeyEncrypted.substring(0, 8)}...${p.apiKeyEncrypted.substring(p.apiKeyEncrypted.length - 4)}` : 'Non configuré',
      hasKey: !!p.apiKeyEncrypted,
    }))

    return NextResponse.json({ success: true, data: publicProviders })
  } catch (error) {
    console.error('[Admin Providers GET] Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

// POST — Ajouter un fournisseur
const CreateProviderSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug invalide (minuscules, chiffres, tirets)'),
  name: z.string().min(2),
  description: z.string().min(1),
  baseUrl: z.string().url(),
  defaultModel: z.string().min(1),
  apiType: z.enum(['openai', 'gemini', 'anthropic', 'custom']),
  authPrefix: z.string().default('Bearer '),
  priority: z.number().int().default(0),
  strengths: z.array(z.string()).default(['general']),
  languages: z.array(z.string()).default(['en', 'fr']),
  speed: z.number().int().min(1).max(5).default(3),
  apiKey: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const admin = await adminAuth(request)
    if (!admin) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

    const body = await request.json()
    const parsed = CreateProviderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 })
    }

    const data = parsed.data

    // Vérifier l'unicité du slug
    const existing = await db.aIProvider.findUnique({ where: { slug: data.slug } })
    if (existing) {
      return NextResponse.json({ error: `Le fournisseur "${data.slug}" existe déjà.` }, { status: 409 })
    }

    const provider = await db.aIProvider.create({
      data: {
        slug: data.slug,
        name: data.name,
        description: data.description,
        baseUrl: data.baseUrl,
        defaultModel: data.defaultModel,
        apiType: data.apiType,
        authPrefix: data.authPrefix,
        authHeader: data.apiType === 'anthropic' ? 'x-api-key' : 'Authorization',
        priority: data.priority,
        strengths: JSON.stringify(data.strengths),
        languages: JSON.stringify(data.languages),
        speed: data.speed,
        apiKeyEncrypted: data.apiKey ? encryptKey(data.apiKey) : '',
      },
    })

    invalidateProviderCache()

    return NextResponse.json({ success: true, data: toPublic(provider) })
  } catch (error) {
    console.error('[Admin Providers POST] Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

// PATCH — Modifier un fournisseur
export async function PATCH(request: NextRequest) {
  try {
    const admin = await adminAuth(request)
    if (!admin) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

    const body = await request.json()
    const { id, isActive, priority, apiKey, name, description, baseUrl, defaultModel, strengths, languages, speed } = body

    if (!id) return NextResponse.json({ error: 'id requis.' }, { status: 400 })

    const existing = await db.aIProvider.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Fournisseur non trouvé.' }, { status: 404 })

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (isActive !== undefined) updateData.isActive = isActive
    if (priority !== undefined) updateData.priority = priority
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl
    if (defaultModel !== undefined) updateData.defaultModel = defaultModel
    if (speed !== undefined) updateData.speed = speed
    if (strengths !== undefined) updateData.strengths = JSON.stringify(strengths)
    if (languages !== undefined) updateData.languages = JSON.stringify(languages)
    if (apiKey !== undefined) updateData.apiKeyEncrypted = apiKey ? encryptKey(apiKey) : ''

    const updated = await db.aIProvider.update({
      where: { id },
      data: updateData,
    })

    invalidateProviderCache()

    return NextResponse.json({ success: true, data: toPublic(updated) })
  } catch (error) {
    console.error('[Admin Providers PATCH] Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

// DELETE — Supprimer un fournisseur
export async function DELETE(request: NextRequest) {
  try {
    const admin = await adminAuth(request)
    if (!admin) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requis.' }, { status: 400 })

    // Vérifier que le fournisseur existe
    const existing = await db.aIProvider.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Fournisseur non trouvé.' }, { status: 404 })

    await db.aIProvider.delete({ where: { id } })
    invalidateProviderCache()

    return NextResponse.json({ success: true, message: `Fournisseur "${existing.name}" supprimé.` })
  } catch (error) {
    console.error('[Admin Providers DELETE] Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}