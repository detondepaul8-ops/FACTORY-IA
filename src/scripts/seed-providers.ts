import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
    apiKey: 'REDACTED_GEMINI_KEY',
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
    apiKey: 'REDACTED_GROQ_KEY',
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
    apiKey: 'REDACTED_MISTRAL_KEY',
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
    apiKey: 'REDACTED_HF_KEY',
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
    apiKey: 'REDACTED_OR_KEY',
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
    apiKey: 'REDACTED_OPENAI_KEY',
  },
]

function encryptKey(key: string): string {
  return Buffer.from(key).toString('base64')
}

async function main() {
  console.log('Seeding AI Providers...')

  for (const p of PROVIDERS) {
    const existing = await prisma.aIProvider.findUnique({ where: { slug: p.slug } })

    if (existing) {
      await prisma.aIProvider.update({
        where: { slug: p.slug },
        data: {
          name: p.name,
          description: p.description,
          baseUrl: p.baseUrl,
          defaultModel: p.defaultModel,
          apiType: p.apiType,
          authPrefix: p.authPrefix,
          priority: p.priority,
          strengths: p.strengths,
          languages: p.languages,
          speed: p.speed,
          apiKeyEncrypted: encryptKey(p.apiKey),
          updatedAt: new Date(),
        },
      })
      console.log(`  Updated: ${p.slug}`)
    } else {
      await prisma.aIProvider.create({
        data: {
          slug: p.slug,
          name: p.name,
          description: p.description,
          baseUrl: p.baseUrl,
          defaultModel: p.defaultModel,
          apiType: p.apiType,
          authPrefix: p.authPrefix,
          authHeader: p.apiType === 'gemini' ? 'key' : 'Authorization',
          priority: p.priority,
          strengths: p.strengths,
          languages: p.languages,
          speed: p.speed,
          apiKeyEncrypted: encryptKey(p.apiKey),
        },
      })
      console.log(`  Created: ${p.slug}`)
    }
  }

  console.log('Done! 6 providers configured.')
}

main().catch(console.error).finally(() => prisma.$disconnect())