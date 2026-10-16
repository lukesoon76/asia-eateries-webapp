export interface Feedback {
  positives: string[]
  negatives: string[]
}

const MAX_BULLETS = 3
const MAX_LENGTH = 160

const PROVENANCE = /google places|crawled|chiefeater|seed note|seed-row|independently|backlog|places check|name note|duplicate-within|category inferred|as published|\bguide\b|published|announced|screenshot|\bintake\b|query budget|next pass|this batch/i
const NEGATIVE = /complaint|dissent|allegation|smell|cockroach|\brats?\b|rude|dirty|unhygien|hygien|poison|overcook|\bcold\b|soggy|stale|\bslow\b|long wait|wait times?|waiting time|queue|expensive|overpriced|pricey|rip-?off|shrink|uninterested|aged service|mediocre|disappoint|bland|salty|greasy|rushed|parking difficulty|noisy|burnt/i
const POSITIVE = /praise|well-regarded|regarded|legendary|classic|genuine|favou?rite|must|\bbest\b|famous|recommend|excellent|delicious|\bgood\b|\bgreat\b|affordable|\bvalue\b|generous|big portions|friendly|authentic|upgrad|michelin|\bbib\b|iconic|loyal|worth|consistent|tasty|\bfresh\b|crispy|juicy|popular/i
const NEGATED_PROBLEM = /\b(no|without|not|never|nothing)\b[^.;]{0,30}(complaint|dissent|issue|problem|allegation|hygiene)/i
const WARNING = /⚠/

function clean(sentence: string): string {
  return sentence
    .replace(/\[[^\]]*\]/g, '')
    .replace(/⚠️?/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—,;:]+|[\s\-–—,;:]+$/g, '')
    .trim()
}

function truncate(text: string): string {
  return text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH - 1).trimEnd()}…` : text
}

function splitSentences(notes: string): string[] {
  return notes
    .split(/(?<=[.!?])\s+|;\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function rank(items: { text: string; hits: number }[]): string[] {
  return [...items]
    .sort((a, b) => b.hits - a.hits)
    .slice(0, MAX_BULLETS)
    .map((i) => truncate(i.text))
}

export function extractFeedback(notes: string | null, accolades: string | null): Feedback {
  const positives: { text: string; hits: number }[] = []
  const negatives: { text: string; hits: number }[] = []

  if (accolades && accolades !== '-') {
    positives.push({ text: `Accolade: ${accolades}`, hits: 99 })
  }

  if (notes && notes !== '-') {
    for (const raw of splitSentences(notes)) {
      if (PROVENANCE.test(raw)) continue
      const text = clean(raw)
      if (!text) continue

      if (WARNING.test(raw) || (NEGATIVE.test(text) && !NEGATED_PROBLEM.test(raw))) {
        const hits = (text.match(new RegExp(NEGATIVE.source, 'gi')) ?? []).length + (WARNING.test(raw) ? 2 : 0)
        negatives.push({ text, hits })
      } else if (POSITIVE.test(text)) {
        const hits = (text.match(new RegExp(POSITIVE.source, 'gi')) ?? []).length
        positives.push({ text, hits })
      }
    }
  }

  return { positives: rank(positives), negatives: rank(negatives) }
}
