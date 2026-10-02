// Core game logic for the Mahjong-style ways demo (virtual credits only)
export const ROWS = [4, 5, 5, 5, 4] // 4*5*5*5*4 = 2000 ways
export const COLS = ROWS.length

export const SYMBOLS = [
  { id: 'fa', ch: '發', color: '#1f8a3a', pay: [0, 0, 0, 15, 30, 50], w: 3 },
  { id: 'zhong', ch: '中', color: '#c8102e', pay: [0, 0, 0, 10, 25, 40], w: 4 },
  { id: 'bai', ch: '▢', color: '#3a3ab8', pay: [0, 0, 0, 8, 20, 30], w: 5 },
  { id: 'ba', ch: '八\n萬', color: '#c8102e', pay: [0, 0, 0, 6, 15, 25], w: 6 },
  { id: 'dot5', ch: '⦿⦿\n⦿⦿', color: '#2d6bd1', pay: [0, 0, 0, 4, 10, 15], w: 7 },
  { id: 'dot2', ch: '◎\n◎', color: '#1f8a3a', pay: [0, 0, 0, 2, 5, 10], w: 8 },
  { id: 'bam', ch: '‖ ‖', color: '#1f8a3a', pay: [0, 0, 0, 2, 4, 8], w: 8 },
]
export const SCATTER = { id: 'hu', ch: '胡', color: '#d4141c' }
export const WILD = { id: 'wild', ch: 'WILD', color: '#b07a00' }
export const NORMAL_MULT = [1, 2, 3, 5]
export const FREE_MULT = [2, 4, 6, 10]
export const PAY_UNIT = 1100
export const BETS = [0.6, 1.2, 2.4, 6, 12, 24, 60, 120]

export const DEFAULT_SETTINGS = {
  scatterWeight: 0.3,   // relative frequency of 胡 tiles
  goldChance: 18,       // % chance a middle-reel tile is gold
  payoutScale: 100,     // % applied to every symbol payout (main RTP knob)
  freeSpins: 10,        // free spins for 3 scatters
  extraPerScatter: 2,   // extra free spins per scatter above 3
  minScatter: 3,        // scatters needed to trigger
  startBalance: 100000,
}

const KEY = 'mahjong-demo-settings'
export function loadSettings() {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { ...DEFAULT_SETTINGS } }
}
export function saveSettings(s) { localStorage.setItem(KEY, JSON.stringify(s)) }

let uid = 0
export function randTile(col, s) {
  const pool = [...SYMBOLS, { ...SCATTER, w: Number(s.scatterWeight) }]
  const total = pool.reduce((a, x) => a + x.w, 0)
  let r = Math.random() * total
  let sym = pool[pool.length - 1]
  for (const p of pool) { if ((r -= p.w) < 0) { sym = p; break } }
  const gold = col >= 1 && col <= 3 && sym.id !== 'hu' && Math.random() * 100 < s.goldChance
  return { key: ++uid, sym, gold }
}
export const newGrid = s => ROWS.map((n, c) => Array.from({ length: n }, () => randTile(c, s)))

export function evaluate(grid, bet, s) {
  let win = 0
  const hits = new Set()
  for (const sym of SYMBOLS) {
    let ways = 1, reels = 0
    const cells = []
    for (let c = 0; c < COLS; c++) {
      const m = grid[c].map((t, r) => [t, r]).filter(([t]) => t.sym.id === sym.id || t.sym.id === 'wild')
      if (!m.length) break
      reels++; ways *= m.length
      m.forEach(([, r]) => cells.push(`${c}-${r}`))
    }
    if (reels >= 3) {
      win += (bet / PAY_UNIT) * sym.pay[reels] * ways * (s.payoutScale / 100)
      cells.forEach(k => hits.add(k))
    }
  }
  return { win, hits }
}

export function cascade(grid, hits, s) {
  return grid.map((col, c) => {
    const remain = []
    col.forEach((t, r) => {
      const hit = hits.has(`${c}-${r}`)
      if (!hit) remain.push(t)
      else if (t.gold) remain.push({ key: ++uid, sym: WILD, gold: false })
    })
    return [...Array.from({ length: col.length - remain.length }, () => randTile(c, s)), ...remain]
  })
}

export const countScatter = g => g.flat().filter(t => t.sym.id === 'hu').length
export const freeSpinsFor = (n, s) => n >= s.minScatter ? Number(s.freeSpins) + (n - s.minScatter) * s.extraPerScatter : 0

// Full spin (with cascades) without animation — used by the RTP simulator
export function playRound(bet, s, inFree) {
  const mults = inFree ? FREE_MULT : NORMAL_MULT
  let g = newGrid(s), step = 0, total = 0
  for (;;) {
    const { win, hits } = evaluate(g, bet, s)
    if (!win) break
    total += win * mults[Math.min(step, 3)]
    g = cascade(g, hits, s); step++
  }
  return { total, free: freeSpinsFor(countScatter(g), s) }
}

export function simulate(s, spins = 10000) {
  let wagered = 0, returned = 0, triggers = 0
  for (let i = 0; i < spins; i++) {
    wagered += 1
    let r = playRound(1, s, false)
    returned += r.total
    let fs = r.free
    if (fs) triggers++
    let guard = 0
    while (fs > 0 && guard++ < 500) { fs--; const f = playRound(1, s, true); returned += f.total; fs += f.free }
  }
  return { rtp: (returned / wagered) * 100, hitFree: spins / Math.max(triggers, 1) }
}
