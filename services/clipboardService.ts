import type React from 'react';
/**
 * Utility to convert rich HTML from clipboard (copied from Web, Word, Google Docs, ChatGPT)
 * into clean, formatted Markdown for Notes and Interview dashboards.
 */

export function htmlToMarkdown(htmlString: string): string {
  if (!htmlString || typeof htmlString !== 'string') return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const body = doc.body;

  if (!body) return '';

  const result = traverseNode(body).trim();
  // Clean up excessive blank lines (more than 2 consecutive newlines -> 2)
  return result.replace(/\n{3,}/g, '\n\n');
}

function traverseNode(node: Node, context: { listType?: 'ul' | 'ol'; listIndex?: number; indentLevel?: number } = {}): string {
  const indent = context.indentLevel || 0;
  const indentStr = '  '.repeat(indent);

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    // Normalize spaces within regular text, but do not kill intentional newlines
    return text.replace(/[ \t]+/g, ' ');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  // Ignored elements
  if (['style', 'script', 'noscript', 'meta', 'link', 'svg'].includes(tag)) {
    return '';
  }

  const getChildrenMarkdown = (ctx = context): string => {
    let output = '';
    let olCounter = 1;
    for (let i = 0; i < el.childNodes.length; i++) {
      const child = el.childNodes[i];
      if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName.toLowerCase() === 'li') {
        output += traverseNode(child, { ...ctx, listIndex: olCounter++ });
      } else {
        output += traverseNode(child, ctx);
      }
    }
    return output;
  };

  switch (tag) {
    case 'h1':
      return `\n\n# ${getChildrenMarkdown().trim()}\n\n`;
    case 'h2':
      return `\n\n## ${getChildrenMarkdown().trim()}\n\n`;
    case 'h3':
      return `\n\n### ${getChildrenMarkdown().trim()}\n\n`;
    case 'h4':
      return `\n\n#### ${getChildrenMarkdown().trim()}\n\n`;
    case 'h5':
      return `\n\n##### ${getChildrenMarkdown().trim()}\n\n`;
    case 'h6':
      return `\n\n###### ${getChildrenMarkdown().trim()}\n\n`;

    case 'p': {
      const content = getChildrenMarkdown().trim();
      return content ? `\n\n${content}\n\n` : '\n';
    }

    case 'div': {
      // If it has callout or quote style
      const content = getChildrenMarkdown().trim();
      return content ? `\n\n${content}\n\n` : '';
    }

    case 'br':
      return '\n';

    case 'b':
    case 'strong': {
      // Filter out Google Docs bold resets like <b style="font-weight:normal">
      if (el.style.fontWeight === 'normal' || el.style.fontWeight === '400') {
        return getChildrenMarkdown();
      }
      const boldText = getChildrenMarkdown().trim();
      return boldText ? `**${boldText}**` : '';
    }

    case 'i':
    case 'em': {
      const italicText = getChildrenMarkdown().trim();
      return italicText ? `*${italicText}*` : '';
    }

    case 'u': {
      const uText = getChildrenMarkdown().trim();
      return uText ? `<u>${uText}</u>` : '';
    }

    case 's':
    case 'strike':
    case 'del': {
      const strikeText = getChildrenMarkdown().trim();
      return strikeText ? `~~${strikeText}~~` : '';
    }

    case 'code': {
      // If parent is pre, pre handles it
      if (el.parentElement?.tagName.toLowerCase() === 'pre') {
        return el.textContent || '';
      }
      const codeText = el.textContent || '';
      return codeText ? ` \`${codeText.replace(/`/g, '\\`')}\` ` : '';
    }

    case 'pre': {
      const codeTag = el.querySelector('code');
      const lang = codeTag?.className?.match(/language-([a-z0-9_-]+)/i)?.[1] || '';
      const codeText = (codeTag ? codeTag.textContent : el.textContent) || '';
      return `\n\n\`\`\`${lang}\n${codeText.replace(/\n+$/, '')}\n\`\`\`\n\n`;
    }

    case 'blockquote': {
      const rawText = getChildrenMarkdown().trim();
      if (!rawText) return '';
      const quoted = rawText
        .split('\n')
        .map(line => `> ${line}`)
        .join('\n');
      return `\n\n${quoted}\n\n`;
    }

    case 'ul': {
      const ulContent = getChildrenMarkdown({ ...context, listType: 'ul', indentLevel: indent + (context.listType ? 1 : 0) });
      return `\n\n${ulContent.trim()}\n\n`;
    }

    case 'ol': {
      const olContent = getChildrenMarkdown({ ...context, listType: 'ol', indentLevel: indent + (context.listType ? 1 : 0) });
      return `\n\n${olContent.trim()}\n\n`;
    }

    case 'li': {
      const isOrdered = context.listType === 'ol';
      const bullet = isOrdered ? `${context.listIndex || 1}. ` : '- ';
      const liContent = getChildrenMarkdown({ ...context, indentLevel: indent }).trim();
      return `\n${indentStr}${bullet}${liContent}`;
    }

    case 'a': {
      const href = el.getAttribute('href');
      const linkText = getChildrenMarkdown().trim();
      if (!href) return linkText;
      return `[${linkText || href}](${href})`;
    }

    case 'hr':
      return '\n\n---\n\n';

    case 'table': {
      return `\n\n${parseHtmlTable(el)}\n\n`;
    }

    default:
      return getChildrenMarkdown();
  }
}

function parseHtmlTable(tableEl: HTMLElement): string {
  const rows = Array.from(tableEl.querySelectorAll('tr'));
  if (rows.length === 0) return '';

  const tableData = rows.map(row => {
    const cells = Array.from(row.querySelectorAll('th, td'));
    return cells.map(cell => (cell.textContent || '').trim().replace(/\|/g, '\\|'));
  });

  const columnCount = Math.max(...tableData.map(r => r.length));
  if (columnCount === 0) return '';

  const formattedRows: string[] = [];

  // Header row
  const firstRow = tableData[0];
  const headerCells = Array.from({ length: columnCount }, (_, i) => firstRow[i] || '');
  formattedRows.push(`| ${headerCells.join(' | ')} |`);
  formattedRows.push(`| ${Array(columnCount).fill('---').join(' | ')} |`);

  // Body rows
  for (let r = 1; r < tableData.length; r++) {
    const row = tableData[r];
    const cells = Array.from({ length: columnCount }, (_, i) => row[i] || '');
    formattedRows.push(`| ${cells.join(' | ')} |`);
  }

  return formattedRows.join('\n');
}

/**
 * Intercepts a paste event on a textarea or input.
 * If HTML is present, converts it to Markdown and inserts at the cursor position.
 * Returns true if handled, false if default paste should proceed.
 */
export function handleSmartPaste(
  event: React.ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  onInsertText: (insertedMarkdown: string) => void
): boolean {
  const html = event.clipboardData.getData('text/html');
  const plain = event.clipboardData.getData('text/plain');

  // Only run smart conversion if clipboard has rich HTML formatting
  // (contains tags other than basic wrapper or plain text)
  if (html && (/<(strong|b|em|i|blockquote|ul|ol|li|h[1-6]|pre|code|table|a)[\s>]/i.test(html) || /class="[^"]*"/i.test(html))) {
    try {
      const markdown = htmlToMarkdown(html);
      if (markdown && markdown.trim()) {
        event.preventDefault();
        onInsertText(markdown);
        return true;
      }
    } catch (err) {
      console.warn('Smart paste conversion failed, falling back to plain text:', err);
    }
  }

  // If plain text has rich formatting or fallback
  return false;
}

