// POST /api/momo — Initiier un paiement Mobile Money
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth/utils'
import { randomBytes } from 'crypto'

const PLANS: Record<string, { credits: number; price: number; label: string }> = {
  starter: { credits: 100, price: 500, label: 'Starter — 100 crédits' },
  pro: { credits: 500, price: 2000, label: 'Pro — 500 crédits' },
  business: { credits: 2000, price: 7000, label: 'Business — 2000 crédits' },
  enterprise: { credits: 10000, price: 30000, label: 'Enterprise — 10 000 crédits' },
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const user = await getUserFromToken(token)
    if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

    const body = await request.json()
    const { plan, phoneNumber, provider } = body

    if (!plan || !PLANS[plan]) {
      return NextResponse.json(
        { error: `Plan invalide. Choisissez parmi : ${Object.keys(PLANS).join(', ')}` },
        { status: 400 }
      )
    }

    if (!phoneNumber || !provider) {
      return NextResponse.json({ error: 'Numéro de téléphone et opérateur requis.' }, { status: 400 })
    }

    if (!['mtn', 'moov', 'orange'].includes(provider)) {
      return NextResponse.json({ error: 'Opérateur invalide (mtn, moov, orange).' }, { status: 400 })
    }

    const planInfo = PLANS[plan]
    const externalRef = `MOMO_${randomBytes(8).toString('hex').toUpperCase()}`

    const momoTx = await db.momoTransaction.create({
      data: {
        userId: user.id,
        phoneNumber,
        amount: planInfo.price,
        creditsGranted: planInfo.credits,
        status: 'success',
        provider,
        externalRef,
      },
    })

    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: {
          credits: { increment: planInfo.credits },
          plan: plan === 'enterprise' ? 'enterprise' : plan === 'business' ? 'pro' : user.plan,
        },
      }),
      db.creditTransaction.create({
        data: {
          userId: user.id,
          amount: planInfo.credits,
          type: 'momo_payment',
          description: `Achat ${planInfo.label} via ${provider.toUpperCase()} Mobile Money`,
          referenceId: momoTx.id,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        transactionId: momoTx.id,
        externalRef: momoTx.externalRef,
        amount: planInfo.price,
        creditsGranted: planInfo.credits,
        provider: provider.toUpperCase(),
        status: momoTx.status,
      },
    })
  } catch (error) {
    console.error('[MoMo] Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const user = await getUserFromToken(token)
    if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

    const transactions = await db.momoTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: transactions })
  } catch (error) {
    console.error('[MoMo GET] Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

export { PLANS }