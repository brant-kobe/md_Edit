import type { MarkdownFileApi } from '../shared/file-api'

declare global {
  interface Window {
    api: {
      markdownFile: MarkdownFileApi
    }
  }
}
