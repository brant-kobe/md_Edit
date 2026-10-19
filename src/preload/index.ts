import { contextBridge, ipcRenderer } from 'electron'
import type { AppVersions, MarkdownFileApi } from '../shared/file-api'

// Custom APIs for renderer
const api: { markdownFile: MarkdownFileApi; versions: AppVersions } = {
  markdownFile: {
    newDocument: () => ipcRenderer.invoke('markdown-file:new'),
    open: () => ipcRenderer.invoke('markdown-file:open'),
    save: (content) => ipcRenderer.invoke('markdown-file:save', content),
    saveAs: (content, defaultFileName) =>
      ipcRenderer.invoke('markdown-file:save-as', content, defaultFileName)
  },
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
