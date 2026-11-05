/**
 * Minimal, dependency-free Markdown renderer for post bodies.
 * Supports: headings, bold/italic, inline code, fenced code, lists,
 * blockquotes, tables and horizontal rules. Input is escaped first, so the
 * output is safe to bind with [innerHTML].
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
}

export function renderMarkdown(source: string): string {
  const lines = escapeHtml(source ?? '').split('\n');
  const out: string[] = [];
  let listOpen = false;
  let tableOpen = false;

  const closeList = () => {
    if (listOpen) {
      out.push('</ul>');
      listOpen = false;
    }
  };
  const closeTable = () => {
    if (tableOpen) {
      out.push('</tbody></table>');
      tableOpen = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();

    if (line.startsWith('```')) {
      closeList();
      closeTable();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimEnd().startsWith('```')) {
        body.push(lines[i]);
        i++;
      }
      out.push(`<pre><code>${body.join('\n')}</code></pre>`);
      continue;
    }

    if (!line.trim()) {
      closeList();
      closeTable();
      continue;
    }

    if (/^\|(.+)\|$/.test(line)) {
      const cells = line
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) {
        out.push('</thead><tbody>');
        continue;
      }
      const tag = tableOpen ? 'td' : 'th';
      const row = cells.map((c) => `<${tag}>${inline(c)}</${tag}>`).join('');
      if (!tableOpen) {
        out.push(`<table><thead><tr>${row}</tr>`);
        tableOpen = true;
      } else {
        out.push(`<tr>${row}</tr>`);
      }
      continue;
    }
    closeTable();

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length + 1, 4);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      closeList();
      out.push('<hr>');
      continue;
    }

    const bullet = /^\s*[-*]\s+(.*)$/.exec(raw);
    if (bullet) {
      if (!listOpen) {
        out.push('<ul>');
        listOpen = true;
      }
      out.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }

    if (line.startsWith('&gt;')) {
      closeList();
      out.push(`<blockquote>${inline(line.replace(/^&gt;\s?/, ''))}</blockquote>`);
      continue;
    }

    closeList();
    out.push(`<p>${inline(line.trim())}</p>`);
  }

  closeList();
  closeTable();
  return out.join('\n');
}
