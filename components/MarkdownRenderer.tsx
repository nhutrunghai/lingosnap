import React, { useState } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const renderInline = (text: string): React.ReactNode[] => {
  if (!text) return [];

  // Match bold, italic, inline code, strike, link
  // Tokens:
  // **bold**
  // *italic*
  // `code`
  // ~~strike~~
  // [text](url)
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|~~[^~]+~~|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s<]+)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index} className="italic text-slate-700">
          {part.slice(1, -1)}
        </em>
      );
    }

    if (part.startsWith('~~') && part.endsWith('~~')) {
      return (
        <del key={index} className="line-through text-slate-400">
          {part.slice(2, -2)}
        </del>
      );
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.88em] font-semibold text-rose-600 border border-slate-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
        >
          {linkMatch[1]}
        </a>
      );
    }

    if (/^https?:\/\/[^\s<]+$/.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800 break-all"
        >
          {part}
        </a>
      );
    }

    return <span key={index}>{part}</span>;
  });
};

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative my-3 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 text-slate-100 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-1.5 text-xs font-mono text-slate-400">
        <span>{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded px-2 py-0.5 text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          <i className={`fa-solid ${copied ? 'fa-check text-emerald-400' : 'fa-copy'}`} />
          <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed sm:text-sm text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content || !content.trim()) {
    return <div className="text-slate-400 italic">Không có nội dung.</div>;
  }

  // Parse blocks: Headings, Code blocks, Blockquotes, Lists, Tables, Callouts, Paragraphs
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Code Block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push(
        <CodeBlock
          key={`code-${i}`}
          language={lang}
          code={codeLines.join('\n')}
        />
      );
      continue;
    }

    // 3. Headings (# H1, ## H2, ### H3, #### H4)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const headingClass =
        level === 1
          ? 'text-2xl font-bold tracking-tight text-slate-900 mt-6 mb-3 border-b border-slate-200 pb-2'
          : level === 2
          ? 'text-xl font-bold tracking-tight text-slate-900 mt-5 mb-2'
          : level === 3
          ? 'text-lg font-bold text-slate-800 mt-4 mb-2'
          : 'text-base font-bold text-slate-800 mt-3 mb-1';

      blocks.push(
        <div key={`h-${i}`} className={headingClass}>
          {renderInline(text)}
        </div>
      );
      i++;
      continue;
    }

    // 4. Horizontal rule
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      blocks.push(<hr key={`hr-${i}`} className="my-5 border-slate-200" />);
      i++;
      continue;
    }

    // 5. Blockquote (can be multi-line)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('>') || (lines[i].trim() && !lines[i].trim().startsWith('#')))) {
        if (lines[i].trim().startsWith('>')) {
          quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        } else {
          // continuation of quote paragraph
          quoteLines.push(lines[i].trim());
        }
        i++;
      }
      const quoteContent = quoteLines.join('\n');
      blocks.push(
        <div
          key={`quote-${i}`}
          className="relative my-4 rounded-r-xl border-l-4 border-slate-400 bg-slate-50/80 px-4 py-3 sm:px-5 sm:py-4 shadow-sm"
        >
          <div className="space-y-2 text-slate-800 text-[15px] leading-relaxed">
            <MarkdownRenderer content={quoteContent} />
          </div>
        </div>
      );
      continue;
    }

    // 6. Ordered List (1. 2. 3.)
    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      const listItems: { num: string; text: string }[] = [];
      while (i < lines.length) {
        const itemMatch = lines[i].trim().match(/^(\d+)\.\s+(.+)$/);
        if (itemMatch) {
          listItems.push({ num: itemMatch[1], text: itemMatch[2] });
          i++;
        } else if (lines[i].trim().startsWith('   ') || lines[i].trim().startsWith('\t')) {
          // continuation line of previous li
          if (listItems.length > 0) {
            listItems[listItems.length - 1].text += ' ' + lines[i].trim();
          }
          i++;
        } else {
          break;
        }
      }
      blocks.push(
        <ol key={`ol-${i}`} className="my-3 space-y-2 pl-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-slate-800 text-[15px] leading-relaxed">
              <span className="flex-shrink-0 font-bold text-slate-900 min-w-[1.4rem]">
                {item.num}.
              </span>
              <div className="flex-1">{renderInline(item.text)}</div>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 7. Unordered List (- * +)
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      const listItems: string[] = [];
      while (i < lines.length) {
        const itemMatch = lines[i].trim().match(/^[-*+]\s+(.+)$/);
        if (itemMatch) {
          listItems.push(itemMatch[1]);
          i++;
        } else if (lines[i].trim().startsWith('  ') || lines[i].trim().startsWith('\t')) {
          if (listItems.length > 0) {
            listItems[listItems.length - 1] += ' ' + lines[i].trim();
          }
          i++;
        } else {
          break;
        }
      }
      blocks.push(
        <ul key={`ul-${i}`} className="my-3 space-y-1.5 pl-2">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-slate-800 text-[15px] leading-relaxed">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-500" />
              <div className="flex-1">{renderInline(item)}</div>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 8. Markdown Table (| header | header |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const parseRow = (line: string) =>
          line
            .slice(1, -1)
            .split('|')
            .map(cell => cell.trim());
        const headerCells = parseRow(tableLines[0]);
        const bodyLines = tableLines.slice(2); // Skip separator row
        blocks.push(
          <div key={`table-${i}`} className="my-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 font-bold text-slate-900">
                <tr>
                  {headerCells.map((cell, cIdx) => (
                    <th key={cIdx} className="px-3.5 py-2.5 text-left font-semibold">
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {bodyLines.map((rowLine, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50">
                    {parseRow(rowLine).map((cell, cIdx) => (
                      <td key={cIdx} className="px-3.5 py-2.5 text-slate-700">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 9. Callout / Tip box detection (Mẹo phỏng vấn:, Lưu ý:, Tip:, Note:)
    const calloutMatch = trimmed.match(/^(Mẹo phỏng vấn|Lưu ý|Tip|Note|Ghi chú|Quan trọng):\s*(.+)$/i);
    if (calloutMatch) {
      const label = calloutMatch[1];
      const message = calloutMatch[2];
      blocks.push(
        <div
          key={`tip-${i}`}
          className="my-3 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-amber-950 shadow-sm"
        >
          <i className="fa-solid fa-lightbulb mt-0.5 text-amber-600 flex-shrink-0" />
          <div className="text-sm leading-relaxed">
            <strong className="font-bold text-amber-900">{label}: </strong>
            {renderInline(message)}
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 10. Regular Paragraph
    blocks.push(
      <p key={`p-${i}`} className="my-2.5 text-slate-800 text-[15px] leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
    i++;
  }

  return <div className={`space-y-1 font-sans ${className}`}>{blocks}</div>;
};

export default MarkdownRenderer;
