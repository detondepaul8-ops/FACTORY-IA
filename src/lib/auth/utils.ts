// Utilitaires d'authentification simples (sans NextAuth pour plus de contrôle)
import { db } from '@/lib/db'
import { createHash, randomBytes } from 'crypto'

// Hash du mot de passe avec SHA-256 + salt
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const hash = createHash('sha256').update(password + salt).digest('hex')
  return `${salt}:${hash}`
}

// Vérification du mot de passe
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':')
  const computed = createHash('sha256').update(password + salt).digest('hex')
  return computed === hash
}

// Créer une session token
export function createSessionToken(): string {
  return randomBytes(32).toString('hex')
}

// Vérifier un token de session (stocké en DB via crédit)
// Pour simplifier, on utilise un header d'auth basique
export async function getUserFromToken(token: string) {
  // Le token est l'email encodé en base64 (simplifié pour le POC)
  try {
    const email = Buffer.from(token, 'base64').toString('utf-8')
    if (!email) return null
    const user = await db.user.findUnique({ where: { email } })
    return user
  } catch {
    return null
  }
}

// Créer un token à partir d'un email
export function createTokenFromEmail(email: string): string {
  return Buffer.from(email).toString('base64')
}