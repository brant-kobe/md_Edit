import type { AppVersions, MarkdownFileApi } from '../shared/file-api'

declare global {
  interface Window {
    api: {
      markdownFile: MarkdownFileApi
      versions: AppVersions
    }
  }
}
