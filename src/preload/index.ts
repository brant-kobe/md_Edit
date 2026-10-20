import { contextBridge, ipcRenderer } from 'electron'
import type { MarkdownFileApi } from '../shared/file-api'

// Custom APIs for renderer
const api: { markdownFile: MarkdownFileApi } = {
  markdownFile: {
    newDocument: () => ipcRenderer.invoke('markdown-file:new'),
    open: () => ipcRenderer.invoke('markdown-file:open'),
    save: (content) => ipcRenderer.invoke('markdown-file:save', content),
    saveAs: (content, defaultFileName) =>
      ipcRenderer.invoke('markdown-file:save-as', content, defaultFileName),
    updateDocument: (content, isDirty, fileName) =>
      ipcRenderer.send('markdown-file:update-document', content, isDirty, fileName)
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
