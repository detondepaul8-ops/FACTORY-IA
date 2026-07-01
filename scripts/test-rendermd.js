// Simuler la fonction renderMd corrigée
function renderMd(text) {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    return '<div class="chat-code"><pre>' + code.trim() + '</pre></div>'
  })

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Lists
  html = html.replace(/^[-•] (.+)$/gm, '<li>$1</li>')
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')

  // Blockquotes (> becomes &gt; after HTML escape)
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr />')

  // Images ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
    (_m, alt, src) => '<div class="img-wrap"><img src="' + src + '" alt="' + alt + '" /></div>'
  )

  // Paragraphs (skip lines already starting with HTML tags)
  html = html.replace(/^(?!(?:<h|<li|<di|<pr|<bl|<ul|<ol|<hr|<im|<p ))(.+)$/gm, '<p>$1</p>')

  // Clean up
  html = html.replace(/<p><\/p>/g, '')

  return html
}

// Simuler la réponse de l'engine pour une génération d'image
const testResponse = `**Génération d'image** | Modèles : Pollinations AI

---

![un chat cosmonaute sur la lune](https://image.pollinations.ai/prompt/un%20chat%20cosmonaute%20sur%20la%20lune?width=1024&height=1024&nologo=true&seed=1234)

**Image générée** : *un chat cosmonaute sur la lune*

> Via Pollinations AI (gratuit)`

const result = renderMd(testResponse)
console.log('=== HTML RENDU ===')
console.log(result)
console.log()

console.log('=== VERIFICATIONS ===')
console.log('Image <img> presente :', result.includes('<img src='))
console.log('HR <hr> presente :', result.includes('<hr'))
console.log('Blockquote <blockquote> presente :', result.includes('<blockquote'))
console.log('Pas de Markdown brut ![ :', !result.includes('!['))
console.log('Image dans un div :', result.includes('<div class="img-wrap">'))