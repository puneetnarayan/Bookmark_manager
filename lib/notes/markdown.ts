function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Minimal, safe Markdown -> HTML renderer for notes. Everything is HTML-escaped first,
 * so no raw HTML from note content can ever reach the DOM — only the specific patterns
 * below (headings, bold, italic, lists, links, code) are turned into tags afterward.
 */
export function renderNoteMarkdown(source: string): string {
  const escaped = escapeHtml(source);
  const lines = escaped.split("\n");
  const html: string[] = [];
  let inUl = false;
  let inOl = false;
  let inCodeBlock = false;
  const codeBlockLines: string[] = [];

  function closeLists() {
    if (inUl) {
      html.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      html.push("</ol>");
      inOl = false;
    }
  }

  for (const rawLine of lines) {
    if (rawLine.trim().startsWith("```")) {
      if (inCodeBlock) {
        html.push(`<pre><code>${codeBlockLines.join("\n")}</code></pre>`);
        codeBlockLines.length = 0;
        inCodeBlock = false;
      } else {
        closeLists();
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    const headingMatch = rawLine.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      closeLists();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${inline(headingMatch[2])}</h${level}>`);
      continue;
    }

    const ulMatch = rawLine.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (inOl) {
        html.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        html.push("<ul>");
        inUl = true;
      }
      html.push(`<li>${inline(ulMatch[1])}</li>`);
      continue;
    }

    const olMatch = rawLine.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      if (inUl) {
        html.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        html.push("<ol>");
        inOl = true;
      }
      html.push(`<li>${inline(olMatch[1])}</li>`);
      continue;
    }

    closeLists();
    if (rawLine.trim() === "") {
      html.push("<br/>");
    } else {
      html.push(`<p>${inline(rawLine)}</p>`);
    }
  }
  closeLists();
  if (inCodeBlock && codeBlockLines.length) {
    html.push(`<pre><code>${codeBlockLines.join("\n")}</code></pre>`);
  }

  return html.join("\n");
}

function inline(escapedText: string): string {
  let text = escapedText;
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return text;
}
