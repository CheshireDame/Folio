
// RTF conversion -- works without external libs for our formatting needs
export function htmlToRtf(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html

  let rtf = '{\\rtf1\\ansi\\deff0'
  rtf += '{\\fonttbl{\\f0\\froman\\fcharset0 Crimson Pro;}{\\f1\\froman\\fcharset0 Georgia;}}'
  rtf += '{\\colortbl;\\red232\\green226\\blue217;}'
  rtf += '\\f0\\fs40\\cf1 '

  function nodeToRtf(node: Node): string {
    if (node.nodeType === 3) {
      return escapeRtf(node.textContent || '')
    }
    if (node.nodeType !== 1) return ''
    const el = node as Element
    const tag = el.tagName.toLowerCase()
    const children = Array.from(el.childNodes).map(nodeToRtf).join('')
    if (tag === 'p')      return children + '\\par\\n'
    if (tag === 'br')     return '\\line '
    if (tag === 'strong' || tag === 'b') return '{\\b ' + children + '}'
    if (tag === 'em' || tag === 'i')     return '{\\i ' + children + '}'
    if (tag === 'u')      return '{\\ul ' + children + '}'
    if (tag === 'h1')     return '{\\b\\fs56 ' + children + '}\\par\\n'
    if (tag === 'h2')     return '{\\b\\fs48 ' + children + '}\\par\\n'
    if (tag === 'h3')     return '{\\b\\fs44 ' + children + '}\\par\\n'
    if (tag === 'img')    return '{\\i [Image: ' + (el.getAttribute('alt') || 'image') + ']}\\par\\n'
    return children
  }

  function escapeRtf(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/[\u0080-\uFFFF]/g, c => '\\u' + c.charCodeAt(0) + '?')
  }

  Array.from(tmp.childNodes).forEach(node => { rtf += nodeToRtf(node) })
  rtf += '}'
  return rtf
}

export function rtfToHtml(rtf: string): string {
  // Basic RTF to HTML for loading saved files
  // Strip RTF header and convert common control words
  let text = rtf
    .replace(/\{\\rtf[^}]*\}/g, '')
    .replace(/\{\\fonttbl[^}]*\}/g, '')
    .replace(/\{\\colortbl[^}]*\}/g, '')
    .replace(/\\par\\n?/g, '</p><p>')
    .replace(/\\line /g, '<br>')
    .replace(/\{\\b\\fs\d+ ([^}]*)\}/g, '<h2>$1</h2>')
    .replace(/\{\\b ([^}]*)\}/g, '<strong>$1</strong>')
    .replace(/\{\\i ([^}]*)\}/g, '<em>$1</em>')
    .replace(/\{\\ul ([^}]*)\}/g, '<u>$1</u>')
    .replace(/\\[a-z]+\d* ?/g, '')
    .replace(/[{}]/g, '')
    .trim()
  return '<p>' + text + '</p>'
}
