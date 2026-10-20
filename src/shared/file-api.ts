export type OpenMarkdownFileResult =
  | { canceled: true }
  | {
      canceled: false
      path: string
      fileName: string
      content: string
    }

export type SaveMarkdownFileResult =
  | { canceled: true }
  | {
      canceled: false
      path: string
      fileName: string
    }

export type NewMarkdownFileResult = {
  canceled: false
}

export type MarkdownFileApi = {
  newDocument: () => Promise<NewMarkdownFileResult>
  open: () => Promise<OpenMarkdownFileResult>
  save: (content: string) => Promise<SaveMarkdownFileResult>
  saveAs: (content: string, defaultFileName?: string) => Promise<SaveMarkdownFileResult>
  updateDocument: (content: string, isDirty: boolean, fileName: string) => void
}

export type AppVersions = Pick<NodeJS.ProcessVersions, 'electron' | 'chrome' | 'node'>
