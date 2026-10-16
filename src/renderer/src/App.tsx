import { useMemo, useState } from 'react'

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
  const [isDark, setIsDark] = useState(true)
  const [showEditor, setShowEditor] = useState(true)
  const [showPreview, setShowPreview] = useState(true)

  const wordCount = useMemo(() => {
    const words = markdown.trim().match(/\S+/g)
    return words?.length ?? 0
  }, [markdown])

  const characterCount = markdown.length
  const panelCount = Number(showEditor) + Number(showPreview)

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
            disabled
            title="File opening will be added in a later stage"
          >
            <span aria-hidden="true">↥</span>
            Open
          </button>
          <button
            className="toolbar-button"
            type="button"
            disabled
            title="File saving will be added in a later stage"
          >
            <span aria-hidden="true">⇩</span>
            Save
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
              <span className="panel-badge">Plain text</span>
            </div>
            <textarea
              className="editor-input"
              value={markdown}
              onChange={(event) => setMarkdown(event.target.value)}
              spellCheck={false}
              aria-label="Markdown source text"
            />
          </section>
        )}

        {showPreview && (
          <section className="panel preview-panel" aria-label="Static Markdown preview">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">PREVIEW</p>
                <h1>Project notes</h1>
              </div>
              <span className="panel-badge">Static example</span>
            </div>
            <article className="document-preview">
              <p className="document-kicker">Writing space / 01</p>
              <h1>Project notes</h1>
              <p>
                This is a quiet space for writing <strong>clear, focused Markdown</strong>.
              </p>
              <h2>Today</h2>
              <ul>
                <li>Capture the idea</li>
                <li>Shape the outline</li>
                <li>Keep the next step visible</li>
              </ul>
              <ol>
                <li>Draft the first pass</li>
                <li>Review the structure</li>
              </ol>
              <blockquote>Good notes make future work easier.</blockquote>
              <p>
                Try <code>inline code</code> when naming a command or a file.
              </p>
              <pre>
                <code>{`const status = 'draft'\nconsole.log(status)`}</code>
              </pre>
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Owner</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Outline</td>
                    <td>Ready</td>
                    <td>You</td>
                  </tr>
                  <tr>
                    <td>Draft</td>
                    <td>In progress</td>
                    <td>You</td>
                  </tr>
                </tbody>
              </table>
            </article>
          </section>
        )}

        {!showEditor && !showPreview && (
          <div className="empty-workspace">Choose Editor or Preview from the toolbar.</div>
        )}
      </section>

      <footer className="statusbar">
        <div className="status-document">
          <span className="status-dot" aria-hidden="true" />
          <span>Untitled document</span>
        </div>
        <div className="status-metrics">
          <span>{wordCount} words</span>
          <span>{characterCount} characters</span>
          <span>Local draft · Not saved to disk</span>
        </div>
      </footer>
    </main>
  )
}

export default App
