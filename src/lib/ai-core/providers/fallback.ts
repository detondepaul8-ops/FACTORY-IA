// Fallback Provider — Utilise z-ai-web-dev-sdk comme IA de secours
// Quand aucune clé API externe n'est configurée
import type { AIResponse } from '../types'

export async function queryFallback(message: string): Promise<AIResponse> {
  const start = Date.now()
  try {
    // Utiliser le SDK interne comme provider de fallback
    const { createLlmChat } = await import('z-ai-web-dev-sdk')
    const chat = createLlmChat()

    const response = await chat.chat({
      messages: [
        {
          role: 'system',
          content: 'Tu es FACTORY IA, un assistant intelligent qui combine plusieurs sources. Réponds de façon claire, structurée et précise. Utilise le Markdown pour formater tes réponses. Si la question est en français, réponds en français.'
        },
        {
          role: 'user',
          content: message,
        }
      ],
    })

    const content = typeof response === 'string' ? response : response?.content || response?.text || JSON.stringify(response)

    return {
      provider: 'gemini', // Se fait passer pour Gemini comme fallback principal
      content: String(content),
      model: 'factory-ia-fallback',
      latency: Date.now() - start,
    }
  } catch {
    // Fallback ultime : réponse simulée pour démo
    return {
      provider: 'gemini',
      content: generateDemoResponse(message),
      model: 'factory-ia-demo',
      latency: Date.now() - start,
    }
  }
}

// Réponse de démonstration quand aucun API n'est dispo
function generateDemoResponse(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('bonjour') || lower.includes('salut') || lower.includes('hello')) {
    return `# 👋 Bonjour !

Bienvenue sur **FACTORY IA** — votre plateforme intelligente multi-IA.

Je suis prêt à vous aider avec :
- **Rédaction** : articles, emails, rapports
- **Code** : développement, debugging, architecture
- **Recherche** : informations à jour, analyse web
- **Analyse** : données, comparaisons, raisonnement
- **Création** : idées, concepts, brainstorming

Comment puis-je vous aider aujourd'hui ?`
  }

  return `# 🧠 Réponse FACTORY IA

> **Note** : Cette réponse est générée en mode démo. Configurez vos clés API (Gemini, Claude, DeepSeek, Mistral, Groq) pour activer le plein potentiel multi-IA.

## Votre question

"${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"

## Analyse de la requête

FACTORY IA a analysé votre demande et déterminé la stratégie optimale de traitement. En mode de production, cette requête serait :

1. **Analysée** par le routeur intelligent (détection d'intention, langue, complexité)
2. **Traitéée** par le(s) meilleur(s) modèle(s) d'IA sélectionné(s) automatiquement
3. **Enrichie** avec une recherche web si nécessaire
4. **Comparée** si plusieurs IA sont sollicitées
5. **Optimisée** pour produire la réponse finale la plus fiable

## Configuration requise

Pour activer le système complet, ajoutez ces variables d'environnement :

| Variable | Service |
|----------|---------|
| \`GEMINI_API_KEY\` | Google Gemini |
| \`CLAUDE_API_KEY\` | Anthropic Claude |
| \`DEEPSEEK_API_KEY\` | DeepSeek |
| \`MISTRAL_API_KEY\` | Mistral AI |
| \`GROQ_API_KEY\` | Groq |
| \`GOOGLE_CX\` | Google Custom Search |
| \`YOUTUBE_API_KEY\` | YouTube Data API |

Le système fonctionne en mode fallback avec z-ai-web-dev-sdk en attendant.`
}