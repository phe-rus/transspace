// the shape the @pherus/rich-text editor emits (Tiptap JSON). Kept
// dependency free so the server validators, the submit form and the inbox
// can all read it the same way
export type RichNode = {
  type?: string
  text?: string
  content?: RichNode[]
  [key: string]: unknown
}

export type RichDoc = { type: "doc"; content?: RichNode[] }

// deeper than any real post; a hostile nested document stops here
const MAX_DEPTH = 40

export function isRichDoc(value: unknown): value is RichDoc {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "doc"
  )
}

const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "listItem",
  "taskItem",
  "blockquote",
  "codeBlock",
  "tableRow",
  "horizontalRule",
])

function collect(node: RichNode, out: string[], depth: number) {
  if (depth > MAX_DEPTH) return
  if (typeof node.text === "string") out.push(node.text)
  if (node.type === "hardBreak") out.push(" ")
  for (const child of node.content ?? []) collect(child, out, depth + 1)
  if (node.type && BLOCK_TYPES.has(node.type)) out.push(" ")
}

// the readable text of a stored value: a legacy plain string as is, an
// editor document flattened to one line of text (for length checks,
// search and the list snippet)
export function plainText(value: unknown): string {
  if (typeof value === "string") return value
  if (!isRichDoc(value)) return ""
  const out: string[] = []
  collect(value, out, 0)
  return out.join("").replace(/\s+/g, " ").trim()
}

function has(node: RichNode, type: string, depth: number): boolean {
  if (depth > MAX_DEPTH) return true
  if (node.type === type) return true
  return (node.content ?? []).some((child) => has(child, type, depth + 1))
}

export function containsNode(value: unknown, type: string): boolean {
  return isRichDoc(value) && has(value, type, 0)
}
