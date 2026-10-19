import { Fragment, useState } from 'react'
import type { KeyboardEvent } from 'react'

type MarkdownEditorProps = {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
}

function renderInlineSyntax(source: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const tokenPattern =
    /(`[^`]*`|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^\s)]+\))/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = tokenPattern.exec(source)) !== null) {
    if (match.index > lastIndex) nodes.push(source.slice(lastIndex, match.index))

    const token = match[0]
    let className = 'syntax-emphasis'
    if (token.startsWith('`')) className = 'syntax-inline-code'
    else if (token.startsWith('**') || token.startsWith('__')) className = 'syntax-strong'
    else if (token.startsWith('[')) className = 'syntax-link'

    nodes.push(
      <span key={key++} className={className}>
        {token}
      </span>
    )
    lastIndex = match.index + token.length
  }

  if (lastIndex < source.length) nodes.push(source.slice(lastIndex))
  return nodes
}

function highlightLine(line: string, inCodeBlock: boolean): React.ReactNode {
  if (inCodeBlock) return <span className="syntax-code-line">{line}</span>

  const fence = /^(\s{0,3})(```|~~~)(.*)$/.exec(line)
  if (fence) {
    return (
      <>
        {fence[1]}
        <span className="syntax-fence">
          {fence[2]}
          {fence[3]}
        </span>
      </>
    )
  }

  const heading = /^(\s{0,3})(#{1,6})(\s+)(.*)$/.exec(line)
  if (heading) {
    return (
      <>
        {heading[1]}
        <span className="syntax-marker">{heading[2]}</span>
        {heading[3]}
        <span className="syntax-heading">{renderInlineSyntax(heading[4])}</span>
      </>
    )
  }

  const quote = /^(\s{0,3})(>)(\s?)(.*)$/.exec(line)
  if (quote) {
    return (
      <>
        {quote[1]}
        <span className="syntax-marker">{quote[2]}</span>
        {quote[3]}
        {renderInlineSyntax(quote[4])}
      </>
    )
  }

  const list = /^(\s{0,3})((?:[-*+])|(?:\d+[.)]))(\s+)(.*)$/.exec(line)
  if (list) {
    return (
      <>
        {list[1]}
        <span className="syntax-marker">{list[2]}</span>
        {list[3]}
        {renderInlineSyntax(list[4])}
      </>
    )
  }

  return <>{renderInlineSyntax(line)}</>
}

function highlightMarkdown(markdown: string): React.ReactNode[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  let inCodeBlock = false

  return lines.map((line, index) => {
    const isFence = /^\s{0,3}(```|~~~)/.test(line)
    const content = highlightLine(line, inCodeBlock)
    if (isFence) inCodeBlock = !inCodeBlock

    return (
      <Fragment key={index}>
        {content}
        {index < lines.length - 1 ? '\n' : null}
      </Fragment>
    )
  })
}

function getAutoIndent(source: string, position: number): string {
  const lineStart = source.lastIndexOf('\n', position - 1) + 1
  const linePrefix = source.slice(lineStart, position)
  const leadingWhitespace = /^[\t ]*/.exec(linePrefix)?.[0] ?? ''

  const quote = /^([\t ]*>)[\t ]?/.exec(linePrefix)
  const quotePrefix = quote ? `${quote[1]} ` : ''
  const content = quote ? linePrefix.slice(quote[0].length) : linePrefix
  const list = /^([\t ]*)([-+*]|\d+[.)])([\t ]+)/.exec(content)

  if (list) {
    return `${quotePrefix}${list[1]}${' '.repeat(list[2].length + list[3].length)}`
  }

  return quotePrefix || leadingWhitespace
}

function insertIndentedNewline(
  event: KeyboardEvent<HTMLTextAreaElement>,
  value: string,
  onChange: (value: string) => void
): void {
  if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return

  const textarea = event.currentTarget
  const { selectionStart, selectionEnd } = textarea
  const indent = getAutoIndent(value, selectionStart)
  const nextValue = `${value.slice(0, selectionStart)}\n${indent}${value.slice(selectionEnd)}`
  const nextCaret = selectionStart + 1 + indent.length

  event.preventDefault()
  onChange(nextValue)

  requestAnimationFrame(() => {
    textarea.setSelectionRange(nextCaret, nextCaret)
  })
}

export function MarkdownEditor({
  value,
  onChange,
  readOnly = false
}: MarkdownEditorProps): React.ReactNode {
  const [scrollOffset, setScrollOffset] = useState({ top: 0, left: 0 })

  return (
    <div className="editor-surface">
      <pre
        className="syntax-layer"
        aria-hidden="true"
        style={{ transform: `translate(${-scrollOffset.left}px, ${-scrollOffset.top}px)` }}
      >
        {highlightMarkdown(value)}
      </pre>
      <textarea
        className="editor-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => insertIndentedNewline(event, value, onChange)}
        onScroll={(event) =>
          setScrollOffset({
            top: event.currentTarget.scrollTop,
            left: event.currentTarget.scrollLeft
          })
        }
        spellCheck={false}
        readOnly={readOnly}
        wrap="off"
        aria-label="Markdown source text"
      />
    </div>
  )
}
