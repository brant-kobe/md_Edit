import { useEffect, useMemo, useRef, useState } from 'react'
import type { SaveMarkdownFileResult } from '../../shared/file-api'
import { MarkdownEditor } from './components/MarkdownEditor'
import { MarkdownPreview } from './components/MarkdownPreview'

const initialMarkdown = `# Project notes

This is a quiet space for writing **clear, focused Markdown**.

## Today

- Capture the idea
- Shape the outline
- Keep the next step visible

1. Draft the first pass
2. Review the structure

> Good notes make future work easier.

Try \`inline code\` when naming a command or a file.

\`\`\`ts
const status = 'draft'
console.log(status)
\`\`\`

| Type | Status | Owner |
| --- | --- | --- |
| Outline | Ready | You |
| Draft | In progress | You |`

function App(): React.JSX.Element {
  const [markdown, setMarkdown] = useState(initialMarkdown)
  const [savedMarkdown, setSavedMarkdown] = useState(initialMarkdown)
  const [filePath, setFilePath] = useState<string | null>(null)
  const [fileName, setFileName] = useState('Untitled document')
  const [isBusy, setIsBusy] = useState(false)
  const [operationStatus, setOperationStatus] = useState<{
    kind: 'success' | 'error' | 'neutral'
    message: string
  }>({ kind: 'neutral', message: 'Local draft · Not saved to disk' })
  const [isDark, setIsDark] = useState(false)
  const [showEditor, setShowEditor] = useState(true)
  const [showPreview, setShowPreview] = useState(true)
  const markdownRef = useRef(markdown)

  const wordCount = useMemo(() => {
    const words = markdown.trim().match(/\S+/g)
    return words?.length ?? 0
  }, [markdown])

  const characterCount = markdown.length
  const isDirty = markdown !== savedMarkdown
  const statusMessage =
    operationStatus.kind === 'error'
      ? operationStatus.message
      : isDirty
        ? 'Unsaved changes'
        : operationStatus.message
  const panelCount = Number(showEditor) + Number(showPreview)

  useEffect(() => {
    markdownRef.current = markdown
  }, [markdown])

  useEffect(() => {
    window.api.markdownFile.updateDocument(markdown, isDirty, fileName)
  }, [markdown, isDirty, fileName])

  const setOperationError = (error: unknown, fallback: string): void => {
    const message = error instanceof Error ? error.message : fallback
    setOperationStatus({ kind: 'error', message: `${fallback}: ${message}` })
  }

  const handleNew = async (): Promise<void> => {
    if (isBusy) return
    if (isDirty && !window.confirm('当前文档有未保存的修改，确定要新建空白文档吗？')) return

    setIsBusy(true)
    setOperationStatus({ kind: 'neutral', message: '正在新建文档…' })
    try {
      await window.api.markdownFile.newDocument()
      setMarkdown('')
      setSavedMarkdown('')
      setFilePath(null)
      setFileName('Untitled document')
      setOperationStatus({ kind: 'success', message: '已新建空白文档 · 尚未保存' })
    } catch (error) {
      setOperationError(error, '新建文档失败')
    } finally {
      setIsBusy(false)
    }
  }

  const handleOpen = async (): Promise<void> => {
    if (isBusy) return
    if (isDirty && !window.confirm('当前文档有未保存的修改，确定要打开其他文件吗？')) return

    setIsBusy(true)
    setOperationStatus({ kind: 'neutral', message: '正在打开文件…' })
    try {
      const result = await window.api.markdownFile.open()
      if (result.canceled) {
        setOperationStatus({ kind: 'neutral', message: '已取消打开' })
        return
      }

      setMarkdown(result.content)
      setSavedMarkdown(result.content)
      setFilePath(result.path)
      setFileName(result.fileName)
      setOperationStatus({ kind: 'success', message: '文件已打开 · 已保存' })
    } catch (error) {
      setOperationError(error, '打开文件失败')
    } finally {
      setIsBusy(false)
    }
  }

  const handleSaveResult = (result: SaveMarkdownFileResult, content: string): void => {
    if (result.canceled) {
      setOperationStatus({ kind: 'neutral', message: '已取消保存' })
      return
    }

    setFilePath(result.path)
    setFileName(result.fileName)
    if (markdownRef.current === content) setSavedMarkdown(content)
    setOperationStatus({ kind: 'success', message: '已保存到磁盘' })
  }

  const handleSave = async (): Promise<void> => {
    if (isBusy) return

    const content = markdown
    setIsBusy(true)
    setOperationStatus({ kind: 'neutral', message: '正在保存…' })
    try {
      const result = filePath
        ? await window.api.markdownFile.save(content)
        : await window.api.markdownFile.saveAs(content, 'Untitled.md')
      handleSaveResult(result, content)
    } catch (error) {
      setOperationError(error, '保存文件失败')
    } finally {
      setIsBusy(false)
    }
  }

  const handleSaveAs = async (): Promise<void> => {
    if (isBusy) return

    const content = markdown
    const defaultFileName = filePath ? fileName : 'Untitled.md'
    setIsBusy(true)
    setOperationStatus({ kind: 'neutral', message: '正在另存为…' })
    try {
      const result = await window.api.markdownFile.saveAs(content, defaultFileName)
      handleSaveResult(result, content)
    } catch (error) {
      setOperationError(error, '另存为失败')
    } finally {
      setIsBusy(false)
    }
  }

  const togglePanel = (panel: 'editor' | 'preview'): void => {
    if (
      panelCount === 1 &&
      ((panel === 'editor' && showEditor) || (panel === 'preview' && showPreview))
    ) {
      return
    }

    if (panel === 'editor') setShowEditor((visible) => !visible)
    else setShowPreview((visible) => !visible)
  }

  return (
    <main className={`app-shell ${isDark ? 'theme-dark' : 'theme-light'}`}>
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            M
          </div>
          <div>
            <p className="app-name">Markdown Editor</p>
            <p className="app-subtitle">Local writing workspace</p>
          </div>
        </div>

        <div className="toolbar" aria-label="Editor toolbar">
          <button
            className="toolbar-button"
            type="button"
            onClick={() => void handleNew()}
            disabled={isBusy}
            title="Create a new blank Markdown file"
          >
            <span aria-hidden="true">＋</span>
            New
          </button>
          <button
            className="toolbar-button"
            type="button"
            onClick={() => void handleOpen()}
            disabled={isBusy}
            title="Open a Markdown file"
          >
            <span aria-hidden="true">↥</span>
            Open
          </button>
          <button
            className="toolbar-button"
            type="button"
            onClick={() => void handleSave()}
            disabled={isBusy}
            title="Save the current Markdown file"
          >
            <span aria-hidden="true">⇩</span>
            Save
          </button>
          <button
            className="toolbar-button"
            type="button"
            onClick={() => void handleSaveAs()}
            disabled={isBusy}
            title="Save the current Markdown file to a new path"
          >
            <span aria-hidden="true">⇩</span>
            Save As
          </button>
          <span className="toolbar-divider" aria-hidden="true" />
          <button
            className={`toolbar-button toggle-button ${showEditor ? 'is-active' : ''}`}
            type="button"
            onClick={() => togglePanel('editor')}
            aria-pressed={showEditor}
            title="Show or hide the editor"
          >
            <span aria-hidden="true">▤</span>
            Editor
          </button>
          <button
            className={`toolbar-button toggle-button ${showPreview ? 'is-active' : ''}`}
            type="button"
            onClick={() => togglePanel('preview')}
            aria-pressed={showPreview}
            title="Show or hide the preview"
          >
            <span aria-hidden="true">▥</span>
            Preview
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => setIsDark((dark) => !dark)}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {isDark ? '☼' : '☾'}
          </button>
        </div>
      </header>

      <section className="workspace" aria-label="Markdown workspace">
        {showEditor && (
          <section className="panel editor-panel" aria-label="Markdown editor">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">SOURCE</p>
                <h1>Write in Markdown</h1>
              </div>
              <span className="panel-badge">Syntax highlighted</span>
            </div>
            <MarkdownEditor value={markdown} onChange={setMarkdown} readOnly={isBusy} />
          </section>
        )}

        {showPreview && (
          <section className="panel preview-panel" aria-label="Live Markdown preview">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">PREVIEW</p>
                <h1>Live preview</h1>
              </div>
              <span className="panel-badge">Rendered from source</span>
            </div>
            <article className="document-preview">
              <p className="document-kicker">Writing space / live</p>
              <MarkdownPreview markdown={markdown} />
            </article>
          </section>
        )}

        {!showEditor && !showPreview && (
          <div className="empty-workspace">Choose Editor or Preview from the toolbar.</div>
        )}
      </section>

      <footer className="statusbar">
        <div className="status-document">
          <span className={`status-dot ${isDirty ? 'is-dirty' : ''}`} aria-hidden="true" />
          <span title={filePath ?? undefined}>{fileName}</span>
        </div>
        <div className="status-metrics">
          <span>{wordCount} words</span>
          <span>{characterCount} characters</span>
          <span className={`operation-status ${operationStatus.kind}`} role="status">
            {statusMessage}
          </span>
        </div>
      </footer>
    </main>
  )
}

export default App
