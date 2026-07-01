import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Seed providers WITHOUT API keys — keys are managed via Supabase DB / Vercel env vars
const PROVIDERS = [
  {
    slug: 'gemini',
    name: 'Google Gemini',
    description: 'Général + Raisonnement + Multimodal',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    defaultModel: 'gemini-2.5-flash',
    apiType: 'gemini',
    authPrefix: '',
    priority: 10,
    strengths: JSON.stringify(['general', 'analysis', 'research', 'math', 'translation']),
    languages: JSON.stringify(['fr', 'en', 'de', 'es', 'zh', 'ja']),
    speed: 3,
  },
  {
    slug: 'groq',
    name: 'Groq',
    description: 'Ultra-rapide — Llama 3.3 70B',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
    apiType: 'openai',
    authPrefix: 'Bearer ',
    priority: 9,
    strengths: JSON.stringify(['code', 'general', 'math']),
    languages: JSON.stringify(['en', 'fr']),
    speed: 5,
  },
  {
    slug: 'mistral',
    name: 'Mistral AI',
    description: 'Rapide + Excellent en français',
    baseUrl: 'https://api.mistral.ai/v1/chat/completions',
    defaultModel: 'mistral-large-latest',
    apiType: 'openai',
    authPrefix: 'Bearer ',
    priority: 8,
    strengths: JSON.stringify(['writing', 'general', 'translation', 'creative']),
    languages: JSON.stringify(['fr', 'en', 'de', 'es', 'it']),
    speed: 4,
  },
  {
    slug: 'huggingface',
    name: 'HuggingFace',
    description: 'Open Source — Modèles gratuits',
    baseUrl: 'https://api-inference.huggingface.co/v1/chat/completions',
    defaultModel: 'mistralai/Mistral-7B-Instruct-v0.3',
    apiType: 'openai',
    authPrefix: 'Bearer ',
    priority: 5,
    strengths: JSON.stringify(['code', 'general', 'creative']),
    languages: JSON.stringify(['en', 'fr']),
    speed: 2,
  },
  {
    slug: 'openrouter',
    name: 'OpenRouter',
    description: 'Agrégateur multi-modèles (Claude, GPT, etc.)',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'anthropic/claude-sonnet-4-20250514',
    apiType: 'openai',
    authPrefix: 'Bearer ',
    priority: 7,
    strengths: JSON.stringify(['general', 'code', 'writing', 'analysis']),
    languages: JSON.stringify(['en', 'fr', 'de', 'es']),
    speed: 3,
  },
  {
    slug: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o-mini — Général polyvalent',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    apiType: 'openai',
    authPrefix: 'Bearer ',
    priority: 6,
    strengths: JSON.stringify(['writing', 'analysis', 'code', 'creative', 'general']),
    languages: JSON.stringify(['en', 'fr', 'de', 'es']),
    speed: 3,
  },
]

function encryptKey(key: string): string {
  return Buffer.from(key).toString('base64')
}

async function main() {
  console.log('Seeding AI Providers (no keys — manage via DB or env)...')

  for (const p of PROVIDERS) {
    const existing = await prisma.aIProvider.findUnique({ where: { slug: p.slug } })
    if (existing) {
      console.log(`  ⏭️  ${p.slug} already exists — skipping`)
      continue
    }

    await prisma.aIProvider.create({
      data: {
        ...p,
        apiKeyEncrypted: '',  // Set via Supabase or admin panel
        isActive: p.slug === 'pollinations',  // Only free providers active by default
        authHeader: 'Authorization',
      },
    })
    console.log(`  ✅ ${p.slug} seeded (key required)`)
  }

  console.log('\nDone. Set API keys via Supabase DB or admin panel.')
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})