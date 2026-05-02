const SCRIPTURE_REGEX = /\b((?:1|2|3)\s)?([A-Z][a-z]+)\s(\d+):(\d+)(?:-(\d+))?\b/g

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function highlightScripture(text: string): string {
  const escaped = escapeHtml(text).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")

  return escaped.replace(SCRIPTURE_REGEX, (match) =>
    `<mark style="background:var(--gold-dim);color:var(--gold);padding:0 3px;border-radius:3px;font-weight:600">${match}</mark>`
  )
}
