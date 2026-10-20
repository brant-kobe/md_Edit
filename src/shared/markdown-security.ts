export function isAllowedMarkdownUrl(rawUrl: string): boolean {
  try {
    const protocol = new URL(rawUrl.trim()).protocol
    return protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:'
  } catch {
    return false
  }
}
