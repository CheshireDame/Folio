// Shared curve geometry for Mind Map edges — used by both the on-screen SVG
// (MindMap.tsx) and the exported PNG/SVG (mindmapExport.ts) so exports always
// match what's on screen.
//
// Bend points are converted to a smooth curve via clamped Catmull-Rom -> cubic
// Bezier (tension 1/6). This passes through every point exactly (not just an
// approximation), and with zero bend points the two control points land
// exactly on the straight from->to line, so a plain edge renders pixel-
// identical to a straight <line> — old saved maps are unaffected.

export interface Pt { x: number; y: number }
export interface CRSegment { c1: Pt; c2: Pt; to: Pt }

export function catmullRomSegments(pts: Pt[]): CRSegment[] {
  if (pts.length < 2) return []
  const n = pts.length
  const segs: CRSegment[] = []
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(n - 1, i + 2)]
    segs.push({
      c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      to: p2,
    })
  }
  return segs
}

export function segmentsToSvgPath(start: Pt, segs: CRSegment[]): string {
  let d = `M ${start.x} ${start.y}`
  for (const s of segs) d += ` C ${s.c1.x} ${s.c1.y} ${s.c2.x} ${s.c2.y} ${s.to.x} ${s.to.y}`
  return d
}

export function drawSegmentsOnCanvas(ctx: CanvasRenderingContext2D, start: Pt, segs: CRSegment[]): void {
  ctx.moveTo(start.x, start.y)
  for (const s of segs) ctx.bezierCurveTo(s.c1.x, s.c1.y, s.c2.x, s.c2.y, s.to.x, s.to.y)
}

// Cubic Bezier position at t in [0,1] — used for hit-testing which segment a
// double-click landed nearest to.
export function cubicPointAt(p0: Pt, c1: Pt, c2: Pt, p1: Pt, t: number): Pt {
  const mt = 1 - t
  return {
    x: mt*mt*mt*p0.x + 3*mt*mt*t*c1.x + 3*mt*t*t*c2.x + t*t*t*p1.x,
    y: mt*mt*mt*p0.y + 3*mt*mt*t*c1.y + 3*mt*t*t*c2.y + t*t*t*p1.y,
  }
}

// Which segment (0-based; also the insert index into edge.points, since
// points[j] === pts[j+1]) lies nearest a click point.
export function nearestSegmentIndex(pts: Pt[], segs: CRSegment[], click: Pt): number {
  let bestIdx = 0, bestDist = Infinity
  segs.forEach((seg, i) => {
    const p0 = i === 0 ? pts[0] : segs[i - 1].to
    for (let t = 0; t <= 1; t += 1 / 16) {
      const p = cubicPointAt(p0, seg.c1, seg.c2, seg.to, t)
      const d = Math.hypot(p.x - click.x, p.y - click.y)
      if (d < bestDist) { bestDist = d; bestIdx = i }
    }
  })
  return bestIdx
}
