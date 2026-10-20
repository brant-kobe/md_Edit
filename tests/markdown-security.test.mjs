import assert from 'node:assert/strict'
import test from 'node:test'
import { isAllowedMarkdownUrl } from '../src/shared/markdown-security.ts'

test('allows web links and mail links', () => {
  assert.equal(isAllowedMarkdownUrl('https://example.com/page'), true)
  assert.equal(isAllowedMarkdownUrl('http://example.com'), true)
  assert.equal(isAllowedMarkdownUrl('mailto:writer@example.com'), true)
})

test('rejects script, local-resource, and malformed links', () => {
  assert.equal(isAllowedMarkdownUrl('javascript:alert(1)'), false)
  assert.equal(isAllowedMarkdownUrl('data:text/html,<script>alert(1)</script>'), false)
  assert.equal(isAllowedMarkdownUrl('file:///C:/secret.txt'), false)
  assert.equal(isAllowedMarkdownUrl('//example.com/path'), false)
  assert.equal(isAllowedMarkdownUrl('not a URL'), false)
})
