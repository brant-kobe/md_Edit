import { app, shell, BrowserWindow, dialog, ipcMain } from 'electron'
import { promises as fs } from 'fs'
import { basename, extname, join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import type {
  NewMarkdownFileResult,
  OpenMarkdownFileResult,
  SaveMarkdownFileResult
} from '../shared/file-api'
import { isAllowedMarkdownUrl } from '../shared/markdown-security'

const NEW_MARKDOWN_FILE_CHANNEL = 'markdown-file:new'
const OPEN_MARKDOWN_FILE_CHANNEL = 'markdown-file:open'
const SAVE_MARKDOWN_FILE_CHANNEL = 'markdown-file:save'
const SAVE_AS_MARKDOWN_FILE_CHANNEL = 'markdown-file:save-as'
const UPDATE_DOCUMENT_CHANNEL = 'markdown-file:update-document'

let mainWindow: BrowserWindow | null = null
let currentFilePath: string | null = null
let currentContent = ''
let currentIsDirty = false
let currentFileName = 'Untitled.md'
let closeApproved = false
let closePromptOpen = false

function assertTrustedSender(event: Electron.IpcMainInvokeEvent): void {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    throw new Error('不受信任的文件操作请求。')
  }
}

function assertText(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} 必须是文本。`)
  }
}

function getMarkdownFileName(filePath: string): string {
  return basename(filePath)
}

function ensureMarkdownExtension(filePath: string): string {
  return extname(filePath) ? filePath : `${filePath}.md`
}

function registerFileHandlers(): void {
  ipcMain.on(
    UPDATE_DOCUMENT_CHANNEL,
    (event, content: unknown, isDirty: unknown, fileName: unknown) => {
      if (!mainWindow || event.sender !== mainWindow.webContents) return
      if (typeof content !== 'string' || typeof fileName !== 'string') return
      if (typeof isDirty !== 'boolean') return
      currentContent = content
      currentIsDirty = isDirty
      currentFileName = fileName
    }
  )
  ipcMain.handle(NEW_MARKDOWN_FILE_CHANNEL, (event): NewMarkdownFileResult => {
    assertTrustedSender(event)
    currentFilePath = null
    currentContent = ''
    currentIsDirty = false
    currentFileName = 'Untitled.md'
    return { canceled: false }
  })

  ipcMain.handle(OPEN_MARKDOWN_FILE_CHANNEL, async (event): Promise<OpenMarkdownFileResult> => {
    assertTrustedSender(event)

    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true }
    }

    const filePath = result.filePaths[0]
    const content = await fs.readFile(filePath, 'utf8')
    currentFilePath = filePath
    currentContent = content
    currentIsDirty = false
    currentFileName = getMarkdownFileName(filePath)
    return {
      canceled: false,
      path: filePath,
      fileName: getMarkdownFileName(filePath),
      content
    }
  })

  ipcMain.handle(
    SAVE_MARKDOWN_FILE_CHANNEL,
    async (event, content: unknown): Promise<SaveMarkdownFileResult> => {
      assertTrustedSender(event)
      assertText(content, '文件内容')
      if (!currentFilePath) {
        throw new Error('当前文档尚未关联文件。')
      }
      const targetPath = currentFilePath
      await fs.writeFile(targetPath, content, 'utf8')
      if (currentFilePath === targetPath && currentContent === content) {
        currentIsDirty = false
      }
      return {
        canceled: false,
        path: targetPath,
        fileName: getMarkdownFileName(targetPath)
      }
    }
  )

  ipcMain.handle(
    SAVE_AS_MARKDOWN_FILE_CHANNEL,
    async (event, content: unknown, defaultFileName: unknown): Promise<SaveMarkdownFileResult> => {
      assertTrustedSender(event)
      assertText(content, '文件内容')
      if (defaultFileName !== undefined) assertText(defaultFileName, '默认文件名')

      const result = await dialog.showSaveDialog(mainWindow!, {
        defaultPath: defaultFileName || 'Untitled.md',
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
      })

      if (result.canceled || !result.filePath) {
        return { canceled: true }
      }

      const filePath = ensureMarkdownExtension(result.filePath)
      await fs.writeFile(filePath, content, 'utf8')
      currentFilePath = filePath
      currentFileName = getMarkdownFileName(filePath)
      if (currentContent === content) {
        currentContent = content
        currentIsDirty = false
      }
      return { canceled: false, path: filePath, fileName: getMarkdownFileName(filePath) }
    }
  )
}

function createWindow(): void {
  closeApproved = false
  closePromptOpen = false

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (event) => {
    if (closeApproved || !currentIsDirty || closePromptOpen) return
    event.preventDefault()
    closePromptOpen = true
    void (async () => {
      try {
        const choice = await dialog.showMessageBox(mainWindow!, {
          type: 'warning',
          title: '未保存的修改',
          message: `“${currentFileName}”有未保存的修改。`,
          buttons: ['不保存', '保存', '另存', '取消'],
          cancelId: 3,
          defaultId: 1,
          noLink: true
        })
        if (choice.response === 3) return
        if (choice.response === 1 || choice.response === 2) {
          try {
            if (choice.response === 1 && currentFilePath) {
              const targetPath = currentFilePath
              const content = currentContent
              await fs.writeFile(targetPath, content, 'utf8')
              if (currentFilePath === targetPath && currentContent === content) {
                currentIsDirty = false
              }
            } else {
              const result = await dialog.showSaveDialog(mainWindow!, {
                defaultPath: currentFileName || 'Untitled.md',
                filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
              })
              if (result.canceled || !result.filePath) return
              const filePath = ensureMarkdownExtension(result.filePath)
              const content = currentContent
              await fs.writeFile(filePath, content, 'utf8')
              currentFilePath = filePath
              currentFileName = getMarkdownFileName(filePath)
              if (currentContent === content) currentIsDirty = false
            }
            if ((choice.response === 1 || choice.response === 2) && currentIsDirty) return
          } catch (error) {
            await dialog.showMessageBox(mainWindow!, {
              type: 'error',
              title: '保存失败',
              message: error instanceof Error ? error.message : '无法保存文件。',
              buttons: ['确定']
            })
            return
          }
        }
        closeApproved = true
        mainWindow?.close()
      } finally {
        closePromptOpen = false
      }
    })()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (isAllowedMarkdownUrl(details.url)) void shell.openExternal(details.url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    event.preventDefault()
    if (isAllowedMarkdownUrl(url)) void shell.openExternal(url)
  })
  mainWindow.webContents.on('will-redirect', (event) => {
    event.preventDefault()
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerFileHandlers()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
