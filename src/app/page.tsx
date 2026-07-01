'use client'

import { useState, useEffect, useRef, useCallback, useSyncExternalStore, type FormEvent, type KeyboardEvent } from 'react'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Bot,
  Send,
  LogOut,
  Key,
  Coins,
  Shield,
  History,
  Sun,
  Moon,
  Zap,
  Copy,
  Check,
  Plus,
  Trash2,
  Search,
  Loader2,
  MessageSquare,
  Globe,
  Clock,
  CreditCard,
  Phone,
  UserPlus,
  Users,
  Activity,
  ArrowUpRight,
  ChevronRight,
  Sparkles,
  Terminal,
  FileCode,
  Eye,
  EyeOff,
  Server,
  ServerCrash,
  Heart,
  HeartPulse,
  RefreshCw,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Wifi,
  WifiOff,
  Settings,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface User {
  id: string
  email: string
  name: string
  role: string
  credits: number
  plan: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  meta?: {
    strategy?: string
    aiModelsUsed?: string[]
    webSources?: string[]
    creditsCost?: number
    latency?: number
  }
  loading?: boolean
}

interface ApiKeyItem {
  id: string
  key: string
  name: string
  isActive: boolean
  createdAt: string
}

interface Transaction {
  id: string
  amount: number
  type: string
  description: string
  createdAt: string
}

interface HistoryItem {
  id: string
  message: string
  response: string
  strategy: string
  aiModelsUsed: string
  webSources: string | null
  creditsCost: number
  responseTime: number
  createdAt: string
}

interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  credits: number
  plan: string
  isActive: boolean
  createdAt: string
  _count: { apiKeys: number; queryLogs: number; creditTransactions: number }
}

interface AdminStats {
  overview: {
    totalUsers: number
    activeUsers: number
    totalQueries: number
    totalApiKeys: number
    totalCreditsConsumed: number
  }
  byStrategy: { strategy: string; count: number; avgResponseTime: number }[]
  byPlan: { plan: string; count: number }[]
}

interface ProviderInfo {
  id: string
  slug: string
  name: string
  description: string
  defaultModel: string
  apiType: string
  isActive: boolean
  priority: number
  strengths: string[]
  languages: string[]
  speed: number
  healthStatus: 'healthy' | 'unhealthy' | 'unknown'
  lastHealthCheck: string | null
  totalCalls: number
  successCalls: number
  failedCalls: number
  avgLatencyMs: number
  lastError: string | null
  lastErrorAt: string | null
  apiKeyMasked: string
  hasKey: boolean
  healthResult?: { status: string; message: string; latency: number } | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('factory_token')
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function shortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

let msgCounter = 0
function uid() {
  return `msg_${++msgCounter}_${Date.now()}`
}

// Simple markdown renderer
function renderMd(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    return `<div class="chat-code"><div class="flex items-center justify-between mb-2 px-1 text-xs text-factory-muted"><span>${lang || 'code'}</span></div><pre class="whitespace-pre-wrap text-sm text-factory-green/90">${code.trim()}</pre></div>`
  })

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-factory-card border border-factory-border px-1.5 py-0.5 rounded text-sm font-mono text-factory-green">$1</code>')

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-foreground">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-4 mb-2 text-foreground">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2 text-foreground">$1</h1>')

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Lists
  html = html.replace(/^[\-•] (.+)$/gm, '<li class="ml-4 list-disc text-muted-foreground">$1</li>')
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-muted-foreground">$1</li>')

  // Blockquotes (> text est devenu &gt; text après l'échappement HTML)
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-2 border-factory-accent/40 pl-3 my-2 text-muted-foreground/80 italic">$1</blockquote>')

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="border-factory-border/40 my-4" />')

  // Images ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
    (_m, alt, src) => `<div class="my-3 rounded-xl overflow-hidden border border-factory-border/50 bg-factory-card/50"><img src="${src}" alt="${alt}" class="w-full h-auto rounded-xl" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'p-6 text-center text-sm text-red-400\\'>Erreur de chargement de l\\'image. <a href=\\'${src}\\' target=\\'_blank\\' class=\\'underline\\'>Ouvrir dans un nouvel onglet</a></div>'" /></div>`
  )

  // Paragraphs (lines that aren't already wrapped in HTML tags)
  html = html.replace(/^(?!(?:<h|<li|<di|<pr|<bl|<ul|<ol|<hr|<im|<p ))(.+)$/gm, '<p class="text-muted-foreground leading-relaxed">$1</p>')

  // Clean up excessive newlines
  html = html.replace(/<p class="text-muted-foreground leading-relaxed"><\/p>/g, '')

  return html
}

// ─── Animation Variants ──────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
}

const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: 'easeOut' },
}

// ─── PLANS CONFIG ────────────────────────────────────────────────────────────

const MOMO_PLANS = [
  { id: 'starter', name: 'Starter', credits: 100, price: 500, icon: '⚡', color: 'text-emerald-400' },
  { id: 'pro', name: 'Pro', credits: 500, price: 2000, icon: '🚀', color: 'text-violet-400' },
  { id: 'business', name: 'Business', credits: 2000, price: 7000, icon: '💼', color: 'text-amber-400' },
  { id: 'enterprise', name: 'Enterprise', credits: 10000, price: 30000, icon: '🏢', color: 'text-rose-400' },
]

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

function AuthScreen({ onLogin }: { onLogin: (token: string, user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = mode === 'login' ? { email, password } : { email, name, password }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Erreur')
        return
      }
      toast.success(mode === 'login' ? 'Connexion réussie !' : 'Compte créé avec succès !')
      onLogin(data.data.token, data.data.user)
    } catch {
      toast.error('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-grid">
      {/* Background glow effects */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        {...slideUp}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-3 mb-4"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold gradient-text">FACTORY IA</h1>
          </motion.div>
          <p className="text-muted-foreground text-sm">
            Plateforme d&apos;intelligence artificielle multi-modèles
          </p>
        </div>

        <Card className="border-factory-border bg-factory-card/80 backdrop-blur-xl glow-green">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {mode === 'login' ? 'Se connecter' : 'Créer un compte'}
            </CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Accédez à votre espace FACTORY IA'
                : 'Rejoignez la plateforme multi-AI'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {mode === 'register' && (
                  <motion.div
                    key="name-field"
                    {...fadeIn}
                  >
                    <Label htmlFor="name">Nom complet</Label>
                    <Input
                      id="name"
                      placeholder="Jean Dupont"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      minLength={2}
                      className="mt-1.5 bg-background border-factory-border"
                      aria-label="Nom complet"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1.5 bg-background border-factory-border"
                  aria-label="Adresse email"
                />
              </div>

              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    placeholder={mode === 'register' ? 'Min. 6 caractères' : '••••••••'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={mode === 'register' ? 6 : 1}
                    className="pr-10 bg-background border-factory-border"
                    aria-label="Mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
              </Button>
            </form>

            <Separator className="my-4 bg-factory-border" />

            <p className="text-center text-sm text-muted-foreground">
              {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}{' '}
              <button
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-emerald-400 hover:text-emerald-300 font-medium underline-offset-4 hover:underline"
              >
                {mode === 'login' ? 'S&apos;inscrire' : 'Se connecter'}
              </button>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground/50 mt-6">
          Claude • Gemini • DeepSeek • Mistral • Groq
        </p>
      </motion.div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT TAB
// ═══════════════════════════════════════════════════════════════════════════════

function ChatTab({ user, onUpdateCredits }: { user: User; onUpdateCredits: (c: number) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: trimmed }
    const loadingMsg: ChatMessage = { id: uid(), role: 'assistant', content: '', loading: true }

    setMessages((prev) => [...prev, userMsg, loadingMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await apiFetch('/api/ask', {
        method: 'POST',
        body: JSON.stringify({ message: trimmed }),
      })
      const data = await res.json()

      if (!res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsg.id
              ? { ...m, loading: false, content: `❌ ${data.error || 'Erreur inconnue'}` }
              : m
          )
        )
        if (res.status === 402) toast.error('Crédits insuffisants ! Rechargez votre compte.')
        return
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? {
                ...m,
                loading: false,
                content: data.data.response,
                meta: {
                  strategy: data.data.strategy,
                  aiModelsUsed: data.data.aiModelsUsed,
                  webSources: data.data.webSources,
                  creditsCost: data.data.creditsCost,
                  latency: data.data.latency,
                },
              }
            : m
        )
      )
      if (data.data.creditsCost) {
        onUpdateCredits(user.credits - data.data.creditsCost)
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? { ...m, loading: false, content: '❌ Erreur de connexion au serveur.' }
            : m
        )
      )
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-14rem)] md:max-h-[calc(100vh-12rem)]">
      {/* Messages */}
      <ScrollArea className="flex-1 factory-scroll" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {messages.length === 0 && (
            <motion.div {...slideUp} className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-violet-500/20 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Bienvenue sur FACTORY IA</h3>
              <p className="text-muted-foreground text-sm max-w-md">
                Posez votre question. Notre moteur multi-AI sélectionne automatiquement le meilleur modèle pour répondre.
              </p>
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {['Explique-moi React Server Components', 'Code un tri rapide en Python', 'Quelles sont les tendances IA 2025 ?'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-factory-border text-muted-foreground hover:text-foreground hover:border-emerald-500/50 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                {...fadeIn}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 ${
                    msg.role === 'user'
                      ? 'bg-violet-500/20 text-violet-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {msg.role === 'user' ? <UserPlus className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`max-w-[85%] space-y-1 ${msg.role === 'user' ? 'items-end' : ''}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-violet-500/20 text-foreground border border-violet-500/20 rounded-tr-sm'
                        : 'bg-factory-card border border-factory-border rounded-tl-sm'
                    }`}
                  >
                    {msg.loading ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="factory-pulse">Analyse en cours...</span>
                      </div>
                    ) : (
                      <div
                        className="prose-sm"
                        dangerouslySetInnerHTML={{ __html: renderMd(msg.content) }}
                      />
                    )}
                  </div>

                  {/* Meta info */}
                  {msg.meta && !msg.loading && (
                    <div className="flex flex-wrap items-center gap-1.5 px-1">
                      {msg.meta.strategy && (
                        <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                          {msg.meta.strategy}
                        </Badge>
                      )}
                      {msg.meta.aiModelsUsed?.map((m) => (
                        <Badge key={m} variant="outline" className="text-[10px] h-5 border-factory-border text-muted-foreground">
                          {m}
                        </Badge>
                      ))}
                      {msg.meta.creditsCost != null && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Coins className="w-3 h-3" />-{msg.meta.creditsCost}
                        </span>
                      )}
                      {msg.meta.latency != null && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />{msg.meta.latency}ms
                        </span>
                      )}
                    </div>
                  )}

                  {/* Web Sources */}
                  {msg.meta?.webSources && msg.meta.webSources.length > 0 && (
                    <div className="px-1 mt-1">
                      <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Sources web
                      </p>
                      <div className="flex flex-col gap-0.5">
                        {msg.meta.webSources.slice(0, 3).map((src, i) => (
                          <span key={i} className="text-[10px] text-emerald-400/70 truncate max-w-xs">
                            → {src}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 pt-2 border-t border-factory-border">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question..."
              rows={1}
              className="w-full resize-none rounded-xl bg-factory-card border border-factory-border px-4 py-3 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all min-h-[46px] max-h-[120px]"
              aria-label="Message"
              disabled={loading}
            />
          </div>
          <Button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            size="icon"
            className="h-[46px] w-[46px] rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shrink-0"
            aria-label="Envoyer le message"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-center">
          Enter pour envoyer • Shift+Enter pour un saut de ligne
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// API TAB
// ═══════════════════════════════════════════════════════════════════════════════

function ApiTab({ user }: { user: User }) {
  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchKeys = useCallback(async () => {
    try {
      const res = await apiFetch('/api/keys')
      const data = await res.json()
      if (data.success) setKeys(data.data)
    } catch {
      toast.error('Erreur de chargement des clés')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  const createKey = async () => {
    setCreating(true)
    try {
      const res = await apiFetch('/api/keys', {
        method: 'POST',
        body: JSON.stringify({ name: newKeyName || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success('Clé API créée !')
      setShowCreateDialog(false)
      setNewKeyName('')
      fetchKeys()
    } catch {
      toast.error('Erreur serveur')
    } finally {
      setCreating(false)
    }
  }

  const deleteKey = async (keyId: string) => {
    try {
      const res = await apiFetch(`/api/keys?id=${keyId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success('Clé supprimée')
      fetchKeys()
    } catch {
      toast.error('Erreur serveur')
    }
  }

  const copyKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key)
    setCopiedId(id)
    toast.success('Clé copiée !')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const codeExamples = [
    {
      lang: 'curl',
      label: 'cURL',
      code: `curl -X POST /api/ask \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer VOTRE_CLE_API" \\
  -d '{"message": "Bonjour, qui es-tu ?"}'`,
    },
    {
      lang: 'javascript',
      label: 'JavaScript',
      code: `const response = await fetch('/api/ask', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer VOTRE_CLE_API',
  },
  body: JSON.stringify({ message: 'Bonjour !' }),
});

const data = await response.json();
console.log(data.data.response);`,
    },
    {
      lang: 'python',
      label: 'Python',
      code: `import requests

response = requests.post(
    "/api/ask",
    headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer VOTRE_CLE_API",
    },
    json={"message": "Bonjour !"},
)

data = response.json()
print(data["data"]["response"])`,
    },
  ]

  const [activeCodeTab, setActiveCodeTab] = useState('curl')

  return (
    <div className="space-y-6 p-1">
      {/* API Keys Section */}
      <Card className="border-factory-border bg-factory-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400" />
              Mes clés API
            </CardTitle>
            <CardDescription>Max. 5 clés par compte</CardDescription>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
            disabled={keys.length >= 5}
          >
            <Plus className="w-4 h-4 mr-1" /> Créer
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full bg-factory-border" />
              ))}
            </div>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucune clé API. Créez-en une pour utiliser l&apos;API.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto factory-scroll">
              {keys.map((k) => (
                <motion.div
                  key={k.id}
                  {...fadeIn}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-background border border-factory-border"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{k.name}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{k.key}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">{shortDate(k.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyKey(k.key, k.id)}
                      aria-label="Copier la clé"
                    >
                      {copiedId === k.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteKey(k.id)}
                      aria-label="Supprimer la clé"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documentation */}
      <Card className="border-factory-border bg-factory-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Terminal className="w-4 h-4 text-violet-400" />
            Documentation API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-background border border-factory-border p-4">
            <p className="text-sm font-mono font-semibold text-emerald-400 mb-1">POST /api/ask</p>
            <p className="text-xs text-muted-foreground mb-3">Endpoint principal — Envoyez un message et recevez une réponse IA</p>

            <div className="space-y-2 text-xs">
              <div>
                <p className="font-semibold text-foreground mb-1">Headers</p>
                <div className="chat-code text-[11px]">
                  <pre>{`Content-Type: application/json
Authorization: Bearer <votre_clé_api>`}</pre>
                </div>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Body</p>
                <div className="chat-code text-[11px]">
                  <pre>{`{
  "message": "Votre question ici"
}`}</pre>
                </div>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Réponse</p>
                <div className="chat-code text-[11px]">
                  <pre>{`{
  "success": true,
  "data": {
    "response": "...",
    "strategy": "single_ai",
    "aiModelsUsed": ["gemini"],
    "webSources": [],
    "creditsCost": 1,
    "latency": 1200
  }
}`}</pre>
                </div>
              </div>
            </div>
          </div>

          {/* Code Examples */}
          <div>
            <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-amber-400" />
              Exemples de code
            </p>
            <div className="flex gap-1 mb-2">
              {codeExamples.map((ex) => (
                <button
                  key={ex.lang}
                  onClick={() => setActiveCodeTab(ex.lang)}
                  className={`text-xs px-3 py-1 rounded-md transition-all ${
                    activeCodeTab === ex.lang
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-muted-foreground hover:text-foreground border border-transparent'
                  }`}
                >
                  {ex.label}
                </button>
              ))}
            </div>
            <div className="chat-code">
              <pre className="text-xs">
                {codeExamples.find((e) => e.lang === activeCodeTab)?.code}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-factory-card border-factory-border">
          <DialogHeader>
            <DialogTitle>Créer une clé API</DialogTitle>
            <DialogDescription>
              Donnez un nom à votre clé pour l&apos;identifier facilement.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Ma clé API (optionnel)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="bg-background border-factory-border"
            aria-label="Nom de la clé"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={createKey}
              disabled={creating}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREDITS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function CreditsTab({ user, onUpdateCredits }: { user: User; onUpdateCredits: (c: number) => void }) {
  const [creditsData, setCreditsData] = useState<{
    currentCredits: number
    totalConsumed: number
    totalAdded: number
    transactions: Transaction[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [provider, setProvider] = useState('')
  const [momoLoading, setMomoLoading] = useState(false)

  const fetchCredits = useCallback(async () => {
    try {
      const res = await apiFetch('/api/credits')
      const data = await res.json()
      if (data.success) {
        setCreditsData(data.data)
        onUpdateCredits(data.data.currentCredits)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [onUpdateCredits])

  useEffect(() => { fetchCredits() }, [fetchCredits])

  const handleMomo = async () => {
    if (!selectedPlan || !phoneNumber || !provider) {
      toast.error('Remplissez tous les champs')
      return
    }
    setMomoLoading(true)
    try {
      const res = await apiFetch('/api/momo', {
        method: 'POST',
        body: JSON.stringify({ plan: selectedPlan, phoneNumber, provider }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success(`${MOMO_PLANS.find(p => p.id === selectedPlan)?.credits} crédits ajoutés !`)
      setSelectedPlan('')
      setPhoneNumber('')
      setProvider('')
      fetchCredits()
    } catch {
      toast.error('Erreur serveur')
    } finally {
      setMomoLoading(false)
    }
  }

  const currentCredits = creditsData?.currentCredits ?? user.credits

  return (
    <div className="space-y-6 p-1">
      {/* Balance Overview */}
      <motion.div {...slideUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-factory-border bg-factory-card glow-green sm:col-span-1">
          <CardContent className="pt-6 text-center">
            <Coins className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-4xl font-bold text-emerald-400 glow-text-green">
              {loading ? <Skeleton className="h-10 w-24 mx-auto bg-factory-border" /> : currentCredits}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Crédits disponibles</p>
          </CardContent>
        </Card>
        <Card className="border-factory-border bg-factory-card">
          <CardContent className="pt-6 text-center">
            <ArrowUpRight className="w-6 h-6 text-violet-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-violet-400">
              {loading ? <Skeleton className="h-8 w-16 mx-auto bg-factory-border" /> : `+${creditsData?.totalAdded ?? 0}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total reçus</p>
          </CardContent>
        </Card>
        <Card className="border-factory-border bg-factory-card">
          <CardContent className="pt-6 text-center">
            <Activity className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-400">
              {loading ? <Skeleton className="h-8 w-16 mx-auto bg-factory-border" /> : `-${creditsData?.totalConsumed ?? 0}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total consommés</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Mobile Money Plans */}
      <Card className="border-factory-border bg-factory-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-400" />
            Recharger via Mobile Money
          </CardTitle>
          <CardDescription>Sélectionnez un plan et payez par MTN, Moov ou Orange Money</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {MOMO_PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative p-4 rounded-xl border text-left transition-all ${
                  selectedPlan === plan.id
                    ? 'border-emerald-500 bg-emerald-500/10 glow-green'
                    : 'border-factory-border bg-background hover:border-factory-muted/30'
                }`}
                aria-label={`Plan ${plan.name} : ${plan.credits} crédits pour ${plan.price} FCFA`}
              >
                <span className="text-2xl">{plan.icon}</span>
                <p className={`font-semibold mt-2 ${plan.color}`}>{plan.name}</p>
                <p className="text-lg font-bold text-foreground">{plan.credits.toLocaleString('fr-FR')}</p>
                <p className="text-[10px] text-muted-foreground">crédits</p>
                <p className="text-sm font-semibold text-emerald-400 mt-2">
                  {plan.price.toLocaleString('fr-FR')} FCFA
                </p>
                {selectedPlan === plan.id && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <Separator className="bg-factory-border" />

          {/* MoMo Form */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="phone" className="text-xs">Numéro de téléphone</Label>
              <Input
                id="phone"
                placeholder="+225 07 XX XX XX XX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-1 bg-background border-factory-border"
                aria-label="Numéro de téléphone Mobile Money"
              />
            </div>
            <div>
              <Label className="text-xs">Opérateur</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger className="mt-1 bg-background border-factory-border" aria-label="Sélectionner l'opérateur">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mtn">🟡 MTN</SelectItem>
                  <SelectItem value="moov">🔵 Moov</SelectItem>
                  <SelectItem value="orange">🟠 Orange</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleMomo}
                disabled={momoLoading || !selectedPlan || !phoneNumber || !provider}
                className="w-full bg-gradient-to-r from-emerald-600 to-violet-600 hover:from-emerald-500 hover:to-violet-500 text-white font-medium"
              >
                {momoLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                Payer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card className="border-factory-border bg-factory-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4 text-violet-400" />
            Historique des transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full bg-factory-border" />
              ))}
            </div>
          ) : !creditsData?.transactions.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucune transaction</p>
          ) : (
            <div className="max-h-64 overflow-y-auto factory-scroll">
              <Table>
                <TableHeader>
                  <TableRow className="border-factory-border hover:bg-transparent">
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs text-right">Montant</TableHead>
                    <TableHead className="text-xs text-right hidden sm:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditsData.transactions.map((tx) => (
                    <TableRow key={tx.id} className="border-factory-border">
                      <TableCell className="text-xs py-2.5 max-w-[250px] truncate">{tx.description}</TableCell>
                      <TableCell className={`text-xs text-right font-mono font-semibold ${
                        tx.amount > 0 ? 'text-emerald-400' : 'text-destructive'
                      }`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground hidden sm:table-cell">
                        {shortDate(tx.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDERS TAB (AI Providers Management)
// ═══════════════════════════════════════════════════════════════════════════════

function ProvidersTab() {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingAll, setCheckingAll] = useState(false)
  const [checkingSlug, setCheckingSlug] = useState<string | null>(null)

  const fetchProviders = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/providers')
      const data = await res.json()
      if (data.success) setProviders(data.data)
    } catch {
      toast.error('Erreur de chargement des fournisseurs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProviders() }, [fetchProviders])

  const checkAllHealth = async () => {
    setCheckingAll(true)
    try {
      const res = await apiFetch('/api/admin/providers/health', {
        method: 'POST',
        body: JSON.stringify({ checkAll: true }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Vérification de tous les fournisseurs terminée')
        await fetchProviders()
      } else {
        toast.error(data.error || 'Erreur lors de la vérification')
      }
    } catch {
      toast.error('Erreur serveur lors du health check')
    } finally {
      setCheckingAll(false)
    }
  }

  const checkSingleHealth = async (slug: string) => {
    setCheckingSlug(slug)
    try {
      const res = await apiFetch('/api/admin/providers/health', {
        method: 'POST',
        body: JSON.stringify({ slug }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Health check ${slug} terminé`)
        await fetchProviders()
      } else {
        toast.error(data.error || `Erreur health check ${slug}`)
      }
    } catch {
      toast.error('Erreur serveur')
    } finally {
      setCheckingSlug(null)
    }
  }

  const toggleProvider = async (provider: ProviderInfo) => {
    try {
      const res = await apiFetch('/api/admin/providers', {
        method: 'PATCH',
        body: JSON.stringify({ id: provider.id, isActive: !provider.isActive }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`${provider.name} ${!provider.isActive ? 'activé' : 'désactivé'}`)
        await fetchProviders()
      } else {
        toast.error(data.error || 'Erreur lors de la modification')
      }
    } catch {
      toast.error('Erreur serveur')
    }
  }

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 text-[10px] h-5">
            <Heart className="w-3 h-3 mr-1" /> Healthy
          </Badge>
        )
      case 'unhealthy':
        return (
          <Badge className="bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/20 text-[10px] h-5">
            <HeartPulse className="w-3 h-3 mr-1" /> Unhealthy
          </Badge>
        )
      default:
        return (
          <Badge className="bg-factory-border text-muted-foreground border-factory-border hover:bg-factory-border/80 text-[10px] h-5">
            <ServerCrash className="w-3 h-3 mr-1" /> Unknown
          </Badge>
        )
    }
  }

  const reliability = (p: ProviderInfo) =>
    p.totalCalls > 0 ? Math.round((p.successCalls / p.totalCalls) * 100) : 0

  if (loading) {
    return (
      <div className="space-y-4 p-1">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full bg-factory-border rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (providers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Server className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <p className="text-sm text-muted-foreground">Aucun fournisseur configuré</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4 text-emerald-400" />
            Fournisseurs IA
            <Badge variant="secondary" className="text-[10px] h-5 bg-factory-border text-muted-foreground ml-1">
              {providers.length} fournisseurs
            </Badge>
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Gérez et surveillez vos fournisseurs d'IA</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={checkAllHealth}
          disabled={checkingAll}
          className="border-factory-border text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-8 text-xs"
        >
          {checkingAll ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Vérification...</>
          ) : (
            <><HeartPulse className="w-3.5 h-3.5 mr-1.5" /> Vérifier tous</>
          )}
        </Button>
      </div>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {providers.map((p, idx) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.25 }}
          >
            <Card className={`border-factory-border bg-factory-card h-full flex flex-col ${!p.isActive ? 'opacity-60' : ''}`}>
              {/* Card Header */}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      p.healthStatus === 'healthy' ? 'bg-emerald-500/10' :
                      p.healthStatus === 'unhealthy' ? 'bg-red-500/10' : 'bg-factory-border'
                    }`}>
                      {p.healthStatus === 'healthy' ? (
                        <Wifi className="w-4 h-4 text-emerald-400" />
                      ) : p.healthStatus === 'unhealthy' ? (
                        <WifiOff className="w-4 h-4 text-red-400" />
                      ) : (
                        <Server className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm truncate">{p.name}</CardTitle>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.slug}</p>
                    </div>
                  </div>
                  {getHealthBadge(p.healthStatus)}
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-3 pt-0">
                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>

                {/* Default Model */}
                <div className="flex items-center gap-2">
                  <Terminal className="w-3 h-3 text-muted-foreground shrink-0" />
                  <code className="text-[11px] font-mono bg-background px-2 py-0.5 rounded border border-factory-border truncate">
                    {p.defaultModel}
                  </code>
                  <Badge variant="outline" className="text-[9px] h-4 border-factory-border text-muted-foreground shrink-0">
                    {p.apiType}
                  </Badge>
                </div>

                {/* API Key */}
                <div className="flex items-center gap-2">
                  <Key className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-[11px] font-mono text-muted-foreground truncate">
                    {p.hasKey ? p.apiKeyMasked : '—'}
                  </span>
                  {p.hasKey && (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] h-4 shrink-0">
                      Configurée
                    </Badge>
                  )}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div className="bg-background rounded-lg py-1.5 px-1 border border-factory-border">
                    <p className="text-xs font-bold">{p.totalCalls}</p>
                    <p className="text-[9px] text-muted-foreground">Total</p>
                  </div>
                  <div className="bg-background rounded-lg py-1.5 px-1 border border-factory-border">
                    <p className="text-xs font-bold text-emerald-400">{p.successCalls}</p>
                    <p className="text-[9px] text-muted-foreground">Succès</p>
                  </div>
                  <div className="bg-background rounded-lg py-1.5 px-1 border border-factory-border">
                    <p className="text-xs font-bold text-red-400">{p.failedCalls}</p>
                    <p className="text-[9px] text-muted-foreground">Échecs</p>
                  </div>
                  <div className="bg-background rounded-lg py-1.5 px-1 border border-factory-border">
                    <p className="text-xs font-bold">{p.avgLatencyMs > 0 ? `${p.avgLatencyMs}ms` : '—'}</p>
                    <p className="text-[9px] text-muted-foreground">Latence</p>
                  </div>
                </div>

                {/* Reliability Gauge */}
                {p.totalCalls > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">Fiabilité</span>
                      <span className={`text-[10px] font-mono font-semibold ${
                        reliability(p) >= 95 ? 'text-emerald-400' :
                        reliability(p) >= 80 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {reliability(p)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-background rounded-full border border-factory-border overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${reliability(p)}%` }}
                        transition={{ delay: 0.3 + idx * 0.05, duration: 0.6 }}
                        className={`h-full rounded-full ${
                          reliability(p) >= 95 ? 'bg-emerald-500' :
                          reliability(p) >= 80 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Strengths */}
                {p.strengths.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.strengths.map((s) => (
                      <Badge key={s} variant="secondary" className="text-[9px] h-4 bg-violet-500/10 text-violet-400 border-violet-500/20">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Last Error */}
                {p.lastError && (
                  <div className="flex items-start gap-1.5 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                    <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-red-400/80 line-clamp-2">{p.lastError}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-auto pt-2 border-t border-factory-border/50">
                  <button
                    onClick={() => toggleProvider(p)}
                    className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border transition-all flex-1 justify-center ${
                      p.isActive
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        : 'border-factory-border bg-background text-muted-foreground hover:border-factory-muted/30'
                    }`}
                    aria-label={p.isActive ? `Désactiver ${p.name}` : `Activer ${p.name}`}
                  >
                    {p.isActive ? (
                      <><ToggleRight className="w-3.5 h-3.5" /> Actif</>
                    ) : (
                      <><ToggleLeft className="w-3.5 h-3.5" /> Inactif</>
                    )}
                  </button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => checkSingleHealth(p.slug)}
                    disabled={checkingSlug === p.slug}
                    className="border-factory-border text-xs h-7 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30"
                    aria-label={`Tester ${p.name}`}
                  >
                    {checkingSlug === p.slug ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    <span className="ml-1.5">Tester</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN TAB
// ═══════════════════════════════════════════════════════════════════════════════

function AdminTab() {
  const [adminSubTab, setAdminSubTab] = useState('users')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [creditDialog, setCreditDialog] = useState<{ open: boolean; user: AdminUser | null }>({ open: false, user: null })
  const [creditAmount, setCreditAmount] = useState('')
  const [addingCredits, setAddingCredits] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        apiFetch('/api/admin/stats'),
        apiFetch(`/api/admin/users?search=${encodeURIComponent(search)}`),
      ])
      const statsData = await statsRes.json()
      const usersData = await usersRes.json()
      if (statsData.success) setStats(statsData.data)
      if (usersData.success) {
        setUsers(usersData.data.users)
        setTotalUsers(usersData.data.total)
      }
    } catch {
      toast.error('Erreur de chargement admin')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchData() }, [fetchData])

  const addCredits = async () => {
    if (!creditDialog.user || !creditAmount) return
    setAddingCredits(true)
    try {
      const res = await apiFetch('/api/admin/credits', {
        method: 'POST',
        body: JSON.stringify({ userId: creditDialog.user.id, amount: parseInt(creditAmount) }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success(`${creditAmount} crédits ajoutés à ${creditDialog.user.name}`)
      setCreditDialog({ open: false, user: null })
      setCreditAmount('')
      fetchData()
    } catch {
      toast.error('Erreur serveur')
    } finally {
      setAddingCredits(false)
    }
  }

  return (
    <div className="space-y-4 p-1">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Shield className="w-5 h-5 text-violet-400" />
        Administration
      </h2>
      <Tabs value={adminSubTab} onValueChange={setAdminSubTab}>
        <TabsList className="bg-factory-card border border-factory-border">
          <TabsTrigger value="users" className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400 text-xs gap-1.5">
            <Users className="w-3.5 h-3.5" /> Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="providers" className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400 text-xs gap-1.5">
            <Server className="w-3.5 h-3.5" /> Fournisseurs IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4 space-y-6">
          {/* Stats Cards */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full bg-factory-border" />
              ))}
            </div>
          ) : stats && (
            <motion.div {...slideUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-factory-border bg-factory-card">
                <CardContent className="pt-4 pb-4">
                  <Users className="w-5 h-5 text-emerald-400 mb-2" />
                  <p className="text-2xl font-bold">{stats.overview.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Utilisateurs</p>
                </CardContent>
              </Card>
              <Card className="border-factory-border bg-factory-card">
                <CardContent className="pt-4 pb-4">
                  <MessageSquare className="w-5 h-5 text-violet-400 mb-2" />
                  <p className="text-2xl font-bold">{stats.overview.totalQueries}</p>
                  <p className="text-xs text-muted-foreground">Requêtes</p>
                </CardContent>
              </Card>
              <Card className="border-factory-border bg-factory-card">
                <CardContent className="pt-4 pb-4">
                  <Key className="w-5 h-5 text-amber-400 mb-2" />
                  <p className="text-2xl font-bold">{stats.overview.totalApiKeys}</p>
                  <p className="text-xs text-muted-foreground">Clés API</p>
                </CardContent>
              </Card>
              <Card className="border-factory-border bg-factory-card">
                <CardContent className="pt-4 pb-4">
                  <Coins className="w-5 h-5 text-rose-400 mb-2" />
                  <p className="text-2xl font-bold">{stats.overview.totalCreditsConsumed}</p>
                  <p className="text-xs text-muted-foreground">Crédits consommés</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Strategy breakdown */}
          {stats?.byStrategy && stats.byStrategy.length > 0 && (
            <Card className="border-factory-border bg-factory-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Répartition par stratégie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {stats.byStrategy.map((s) => (
                    <div key={s.strategy} className="p-3 rounded-lg bg-background border border-factory-border">
                      <Badge variant="secondary" className="mb-1 text-xs bg-emerald-500/10 text-emerald-400">
                        {s.strategy}
                      </Badge>
                      <p className="text-lg font-bold">{s.count} requêtes</p>
                      <p className="text-xs text-muted-foreground">~{s.avgResponseTime}ms en moyenne</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Users List */}
          <Card className="border-factory-border bg-factory-card">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-violet-400" />
                    Utilisateurs ({totalUsers})
                  </CardTitle>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-background border-factory-border w-full sm:w-64"
                    aria-label="Rechercher un utilisateur"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full bg-factory-border" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aucun utilisateur trouvé</p>
              ) : (
                <div className="max-h-96 overflow-y-auto factory-scroll">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-factory-border hover:bg-transparent">
                        <TableHead className="text-xs">Utilisateur</TableHead>
                        <TableHead className="text-xs hidden md:table-cell">Rôle</TableHead>
                        <TableHead className="text-xs text-right">Crédits</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell">Plan</TableHead>
                        <TableHead className="text-xs hidden lg:table-cell">Requêtes</TableHead>
                        <TableHead className="text-xs text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id} className="border-factory-border">
                          <TableCell className="py-2.5">
                            <div>
                              <p className="text-xs font-medium truncate max-w-[150px]">{u.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{u.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge
                              variant={u.role === 'admin' ? 'default' : 'secondary'}
                              className={`text-[10px] h-5 ${
                                u.role === 'admin'
                                  ? 'bg-violet-500/20 text-violet-400 border-violet-500/30'
                                  : 'bg-factory-border text-muted-foreground'
                              }`}
                            >
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono">
                            <span className={u.credits < 10 ? 'text-destructive' : 'text-emerald-400'}>
                              {u.credits}
                            </span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline" className="text-[10px] h-5 border-factory-border text-muted-foreground">
                              {u.plan}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
                            {u._count.queryLogs}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                              onClick={() => setCreditDialog({ open: true, user: u })}
                              aria-label={`Ajouter des crédits à ${u.name}`}
                            >
                              <Plus className="w-3 h-3 mr-1" /> Crédits
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Credits Dialog */}
          <Dialog open={creditDialog.open} onOpenChange={(open) => setCreditDialog({ open, user: null })}>
            <DialogContent className="bg-factory-card border-factory-border">
              <DialogHeader>
                <DialogTitle>Ajouter des crédits</DialogTitle>
                <DialogDescription>
                  {creditDialog.user && `Ajouter des crédits à ${creditDialog.user.name} (${creditDialog.user.email})`}
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-2">
                {[50, 100, 500, 1000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setCreditAmount(String(amount))}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                      creditAmount === String(amount)
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-factory-border text-muted-foreground hover:border-factory-muted/30'
                    }`}
                  >
                    +{amount}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                placeholder="Montant personnalisé"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                className="bg-background border-factory-border"
                aria-label="Montant de crédits à ajouter"
              />
              <DialogFooter>
                <Button variant="ghost" onClick={() => setCreditDialog({ open: false, user: null })}>
                  Annuler
                </Button>
                <Button
                  onClick={addCredits}
                  disabled={addingCredits || !creditAmount}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  {addingCredits && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                  Ajouter
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="providers" className="mt-4">
          <ProvidersTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY TAB
// ═══════════════════════════════════════════════════════════════════════════════

function HistoryTab() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    apiFetch('/api/history')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setHistory(data.data)
      })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4 p-1">
      <Card className="border-factory-border bg-factory-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4 text-violet-400" />
            Historique des requêtes
          </CardTitle>
          <CardDescription>Vos dernières requêtes IA</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full bg-factory-border" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucune requête pour le moment</p>
              <p className="text-xs text-muted-foreground/50">Vos requêtes apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-20rem)] overflow-y-auto factory-scroll">
              {history.map((item) => {
                const isExpanded = expandedId === item.id
                let models: string[] = []
                try { models = JSON.parse(item.aiModelsUsed) } catch { models = [item.aiModelsUsed] }
                let sources: string[] = []
                try { if (item.webSources) sources = JSON.parse(item.webSources) } catch { /* empty */ }

                return (
                  <motion.div
                    key={item.id}
                    {...fadeIn}
                    className="rounded-lg border border-factory-border bg-background overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="w-full text-left p-3 hover:bg-factory-card/50 transition-colors"
                      aria-expanded={isExpanded}
                      aria-label={`Requête : ${item.message.substring(0, 50)}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium line-clamp-1 flex-1">{item.message}</p>
                        <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                          {item.strategy}
                        </Badge>
                        {models.slice(0, 2).map((m) => (
                          <Badge key={m} variant="outline" className="text-[10px] h-5 border-factory-border text-muted-foreground">
                            {m}
                          </Badge>
                        ))}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />{item.responseTime}ms
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Coins className="w-3 h-3" />-{item.creditsCost}
                        </span>
                        <span className="text-[10px] text-muted-foreground/50 ml-auto">
                          {shortDate(item.createdAt)}
                        </span>
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 border-t border-factory-border pt-3 space-y-3">
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Question</p>
                              <p className="text-sm text-foreground">{item.message}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Réponse</p>
                              <div
                                className="text-sm text-muted-foreground max-h-60 overflow-y-auto factory-scroll"
                                dangerouslySetInnerHTML={{ __html: renderMd(item.response) }}
                              />
                            </div>
                            {sources.length > 0 && (
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <Globe className="w-3 h-3" /> Sources
                                </p>
                                {sources.map((s, i) => (
                                  <p key={i} className="text-xs text-emerald-400/70 truncate">→ {s}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

function Dashboard({ user: initialUser, onLogout }: { user: User; onLogout: () => void }) {
  const [user, setUser] = useState<User>(initialUser)
  const [activeTab, setActiveTab] = useState('chat')
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    useCallback(() => () => {}, []),
    useCallback(() => true, []),
    useCallback(() => false, [])
  )

  const handleUpdateCredits = useCallback((credits: number) => {
    setUser((prev) => ({ ...prev, credits }))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('factory_token')
    localStorage.removeItem('factory_user')
    onLogout()
    toast.success('Déconnecté')
  }

  const isAdmin = user.role === 'admin'

  const tabs = [
    { id: 'chat', label: 'Chat IA', icon: Bot },
    { id: 'api', label: 'API & Dev', icon: Terminal },
    { id: 'credits', label: 'Crédits', icon: Coins },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: Shield }] : []),
    { id: 'history', label: 'Historique', icon: History },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-grid">
      {/* Background glows */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/3 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-violet-500/3 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-factory-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-bold text-base gradient-text hidden sm:inline">FACTORY IA</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Credits badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">{user.credits}</span>
            </div>

            {/* User info (desktop) */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <span className="text-xs font-bold text-violet-400">{user.name.charAt(0).toUpperCase()}</span>
              </div>
              <span className="text-xs text-muted-foreground max-w-[120px] truncate">{user.name}</span>
            </div>

            {/* Theme toggle */}
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="Changer le thème"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            )}

            {/* Logout */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
              aria-label="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="border-b border-factory-border bg-background/50 backdrop-blur-sm sticky top-14 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2 factory-scroll -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-factory-card'
                  }`}
                  aria-selected={activeTab === tab.id}
                  role="tab"
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="active-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'chat' && <ChatTab user={user} onUpdateCredits={handleUpdateCredits} />}
            {activeTab === 'api' && <ApiTab user={user} />}
            {activeTab === 'credits' && <CreditsTab user={user} onUpdateCredits={handleUpdateCredits} />}
            {activeTab === 'admin' && isAdmin && <AdminTab />}
            {activeTab === 'history' && <HistoryTab />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-factory-border bg-background/50 backdrop-blur-sm mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center">
          <p className="text-xs text-muted-foreground/50 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-emerald-500/50" />
            Powered by Multi-AI Engine
            <span className="text-factory-border">•</span>
            Gemini • Claude • DeepSeek • Mistral • Groq • HuggingFace • OpenRouter • OpenAI
          </p>
        </div>
      </footer>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const emptySubscribe = () => () => {}
const getClientAuth = () => {
  try {
    const token = localStorage.getItem('factory_token')
    const userStr = localStorage.getItem('factory_user')
    if (token && userStr) {
      const user = JSON.parse(userStr)
      return { token, user }
    }
  } catch { /* empty */ }
  return null
}
const getServerAuth = () => null

export default function Home() {
  const [authState, setAuthState] = useState<{ token: string; user: User } | null>(getClientAuth)
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)

  const handleLogin = (token: string, user: User) => {
    localStorage.setItem('factory_token', token)
    localStorage.setItem('factory_user', JSON.stringify(user))
    setAuthState({ token, user })
  }

  const handleLogout = () => {
    setAuthState(null)
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-violet-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground factory-pulse">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!authState) {
    return <AuthScreen onLogin={handleLogin} />
  }

  return <Dashboard user={authState.user} onLogout={handleLogout} />
}