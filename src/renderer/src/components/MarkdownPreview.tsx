import type { ElementType, ReactNode } from 'react'

type MarkdownPreviewProps = {
  markdown: string
}

const linkPattern = /^(https?:\/\/|mailto:)/i

function isSafeLink(href: string): boolean {
  return linkPattern.test(href.trim())
}

function renderInline(source: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const tokenPattern =
    /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^\s)]+(?:\s+"[^"]*")?\))/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = tokenPattern.exec(source)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(source.slice(lastIndex, match.index))
    }

    const token = match[0]
    if (token.startsWith('`')) {
      nodes.push(<code key={key++}>{token.slice(1, -1)}</code>)
    } else if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(<strong key={key++}>{renderInline(token.slice(2, -2))}</strong>)
    } else if (token.startsWith('~~')) {
      nodes.push(<del key={key++}>{renderInline(token.slice(2, -2))}</del>)
    } else if (token.startsWith('*') || token.startsWith('_')) {
      nodes.push(<em key={key++}>{renderInline(token.slice(1, -1))}</em>)
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)$/.exec(token)
      if (linkMatch && isSafeLink(linkMatch[2])) {
        nodes.push(
          <a key={key++} href={linkMatch[2]} title={linkMatch[3]}>
            {renderInline(linkMatch[1])}
          </a>
        )
      } else {
        nodes.push(token)
      }
    }

    lastIndex = match.index + token.length
  }

  if (lastIndex < source.length) {
    nodes.push(source.slice(lastIndex))
  }

  return nodes
}

function renderLines(lines: string): ReactNode[] {
  return lines
    .split('\n')
    .flatMap((line, index) => [
      ...(index > 0 ? [<br key={`break-${index}`} />] : []),
      ...renderInline(line)
    ])
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, '|').trim())
}

function isTableSeparator(line: string): boolean {
  return splitTableRow(line).every((cell) => /^:?-{3,}:?$/.test(cell))
}

function isBlockStart(line: string, nextLine?: string): boolean {
  return (
    /^\s{0,3}(#{1,6})\s+/.test(line) ||
    /^\s{0,3}(```|~~~)/.test(line) ||
    /^\s{0,3}>/.test(line) ||
    /^\s{0,3}[-*+]\s+/.test(line) ||
    /^\s{0,3}\d+[.)]\s+/.test(line) ||
    /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line) ||
    (nextLine !== undefined && line.includes('|') && isTableSeparator(nextLine))
  )
}

function parseBlocks(markdown: string): ReactNode[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let index = 0
  let key = 0

  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) {
      index += 1
      continue
    }

    const fence = /^\s{0,3}(```|~~~)\s*([\w+-]*)\s*$/.exec(line)
    if (fence) {
      const closingFence = fence[1]
      const codeLines: string[] = []
      index += 1
      while (
        index < lines.length &&
        !new RegExp(`^\\s{0,3}${closingFence}\\s*$`).test(lines[index])
      ) {
        codeLines.push(lines[index])
        index += 1
      }
      if (index < lines.length) index += 1
      blocks.push(
        <pre key={key++} className="code-block">
          {fence[2] && <span className="code-language">{fence[2]}</span>}
          <code className={fence[2] ? `language-${fence[2]}` : undefined}>
            {codeLines.join('\n')}
          </code>
        </pre>
      )
      continue
    }

    const heading = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (heading) {
      const Heading = `h${heading[1].length}` as ElementType
      blocks.push(<Heading key={key++}>{renderInline(heading[2])}</Heading>)
      index += 1
      continue
    }

    if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      blocks.push(<hr key={key++} />)
      index += 1
      continue
    }

    if (/^\s{0,3}>/.test(line)) {
      const quoteLines: string[] = []
      while (index < lines.length && /^\s{0,3}>/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s{0,3}>\s?/, ''))
        index += 1
      }
      blocks.push(<blockquote key={key++}>{parseBlocks(quoteLines.join('\n'))}</blockquote>)
      continue
    }

    const unorderedItem = /^\s{0,3}[-*+]\s+(.+)$/.exec(line)
    const orderedItem = /^\s{0,3}\d+[.)]\s+(.+)$/.exec(line)
    if (unorderedItem || orderedItem) {
      const ordered = Boolean(orderedItem)
      const items: string[] = []
      while (index < lines.length) {
        const item = ordered
          ? /^\s{0,3}\d+[.)]\s+(.+)$/.exec(lines[index])
          : /^\s{0,3}[-*+]\s+(.+)$/.exec(lines[index])
        if (!item) break
        items.push(item[1])
        index += 1
      }
      const List = ordered ? 'ol' : 'ul'
      blocks.push(
        <List key={key++}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </List>
      )
      continue
    }

    if (line.includes('|') && lines[index + 1] && isTableSeparator(lines[index + 1])) {
      const headers = splitTableRow(line)
      index += 2
      const rows: string[][] = []
      while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
        rows.push(splitTableRow(lines[index]))
        index += 1
      }
      blocks.push(
        <table key={key++}>
          <thead>
            <tr>
              {headers.map((header, cellIndex) => (
                <th key={cellIndex}>{renderInline(header)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {headers.map((_, cellIndex) => (
                  <td key={cellIndex}>{renderInline(row[cellIndex] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
      continue
    }

    const paragraphLines = [line]
    index += 1
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isBlockStart(lines[index], lines[index + 1])
    ) {
      paragraphLines.push(lines[index])
      index += 1
    }
    blocks.push(<p key={key++}>{renderLines(paragraphLines.join('\n'))}</p>)
  }

  return blocks
}

export function MarkdownPreview({ markdown }: MarkdownPreviewProps): ReactNode {
  return <>{parseBlocks(markdown)}</>
}
