// POST /api/auth/register
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createTokenFromEmail } from '@/lib/auth/utils'
import { z } from 'zod'

const RegisterSchema = z.object({
  email: z.string().email('Email invalide'),
  name: z.string().min(2, 'Nom requis (min 2 caractères)'),
  password: z.string().min(6, 'Mot de passe requis (min 6 caractères)'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = RegisterSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map(i => i.message).join(', ') },
        { status: 400 }
      )
    }

    const { email, name, password } = parsed.data

    // Vérifier si l'email existe déjà
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé.' },
        { status: 409 }
      )
    }

    const hashedPassword = await hashPassword(password)

    // Créer l'utilisateur avec 50 crédits gratuits
    const user = await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        credits: 50,
        plan: 'free',
      },
    })

    // Créer la transaction de bienvenue
    await db.creditTransaction.create({
      data: {
        userId: user.id,
        amount: 50,
        type: 'gift',
        description: 'Crédits de bienvenue',
      },
    })

    // Créer le premier admin si c'est le premier utilisateur
    let finalUser = user
    const userCount = await db.user.count()
    if (userCount === 1) {
      finalUser = await db.user.update({
        where: { id: user.id },
        data: { role: 'admin', plan: 'enterprise', credits: 9999 },
      })
    }

    const token = createTokenFromEmail(user.email)

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: finalUser.id,
          email: finalUser.email,
          name: finalUser.name,
          role: finalUser.role,
          credits: finalUser.credits,
          plan: finalUser.plan,
        },
      },
    })
  } catch (error) {
    console.error('[Register] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du compte.' },
      { status: 500 }
    )
  }
}