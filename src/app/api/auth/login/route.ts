// POST /api/auth/login
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createTokenFromEmail } from '@/lib/auth/utils'
import { z } from 'zod'

const LoginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = LoginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map(i => i.message).join(', ') },
        { status: 400 }
      )
    }

    const { email, password } = parsed.data

    const user = await db.user.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect.' },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Compte désactivé. Contactez le support.' },
        { status: 403 }
      )
    }

    const valid = await verifyPassword(password, user.password)
    if (!valid) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect.' },
        { status: 401 }
      )
    }

    const token = createTokenFromEmail(user.email)

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          credits: user.credits,
          plan: user.plan,
        },
      },
    })
  } catch (error) {
    console.error('[Login] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la connexion.' },
      { status: 500 }
    )
  }
}