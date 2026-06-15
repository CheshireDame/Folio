import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import { htmlToRtf } from './rtf'

export function htmlToPlainText(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  tmp.querySelectorAll('img').forEach(img => {
    img.replaceWith(document.createTextNode('[Image: ' + (img.alt || 'image') + ']'))
  })
  return (tmp.innerText || tmp.textContent || '').trim()
}

export function htmlToMarkdown(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  tmp.querySelectorAll('strong, b').forEach(el => {
    el.insertAdjacentText('beforebegin', '**')
    el.insertAdjacentText('afterend', '**')
  })
  tmp.querySelectorAll('em, i').forEach(el => {
    el.insertAdjacentText('beforebegin', '_')
    el.insertAdjacentText('afterend', '_')
  })
  tmp.querySelectorAll('h1').forEach(el => el.insertAdjacentText('beforebegin', '# '))
  tmp.querySelectorAll('h2').forEach(el => el.insertAdjacentText('beforebegin', '## '))
  tmp.querySelectorAll('h3').forEach(el => el.insertAdjacentText('beforebegin', '### '))
  tmp.querySelectorAll('img').forEach(img => {
    img.replaceWith(document.createTextNode('\n\n![' + (img.alt || 'image') + '](' + img.src + ')\n\n'))
  })
  tmp.querySelectorAll('p').forEach(el => { el.insertAdjacentText('afterend', '\n') })
  return (tmp.innerText || tmp.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
}

export function buildHtml(html: string, draftName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${draftName}</title>
<link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;1,400&display=swap" rel="stylesheet">
<style>
  body { background: #1a1814; color: #e8e2d9; font-family: 'Crimson Pro', Georgia, serif; font-size: 20px; line-height: 1.85; max-width: 680px; margin: 80px auto; padding: 0 40px; }
  img { max-width: 100%; border-radius: 4px; display: block; margin: 1em auto; }
  p { margin-bottom: 0.8em; }
</style>
</head>
<body>
${html}
</body>
</html>`
}

export async function exportDraft(html: string, draftName: string, format: 'txt' | 'md' | 'html' | 'rtf') {
  const extensions: Record<string, string[]> = {
    txt:  ['txt'],
    md:   ['md'],
    html: ['html'],
    rtf:  ['rtf'],
  }

  const path = await save({
    title: 'Export Draft',
    defaultPath: draftName + '.' + format,
    filters: [{ name: format.toUpperCase(), extensions: extensions[format] }],
  })

  if (!path) return

  let content = ''
  if (format === 'txt')  content = htmlToPlainText(html)
  if (format === 'md')   content = htmlToMarkdown(html)
  if (format === 'html') content = buildHtml(html, draftName)
  if (format === 'rtf')  content = htmlToRtf(html)

  await writeTextFile(path, content)
}
