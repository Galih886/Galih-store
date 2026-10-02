import { useState, useRef } from 'react'

// Mahjong-style ways slot demo (virtual credits only)
const COLS = 5
const ROWS = 4
const SYMBOLS = [
  { id: 'fa', ch: '發', color: '#1f8a3a', pay: [0, 0, 0, 15, 30, 50], w: 3 },
  { id: 'zhong', ch: '中', color: '#c8102e', pay: [0, 0, 0, 10, 25, 40], w: 4 },
  { id: 'bai', ch: '▢', color: '#3a3ab8', pay: [0, 0, 0, 8, 20, 30], w: 5 },
  { id: 'ba', ch: '八\n萬', color: '#c8102e', pay: [0, 0, 0, 6, 15, 25], w: 6 },
  { id: 'dot5', ch: '⦿⦿', color: '#2d6bd1', pay: [0, 0, 0, 4, 10, 15], w: 7 },
  { id: 'dot2', ch: '◎', color: '#1f8a3a', pay: [0, 0, 0, 2, 5, 10], w: 8 },
  { id: 'bam', ch: '‖‖', color: '#1f8a3a', pay: [0, 0, 0, 2, 4, 8], w: 8 },
]
const SCATTER = { id: 'hu', ch: '胡', color: '#d4141c', w: 1.2 }
const WILD = { id: 'wild', ch: 'WILD', color: '#b07a00' }
const NORMAL_MULT = [1, 2, 3, 5]
const FREE_MULT = [2, 4, 6, 10]
const BETS = [2, 4, 6, 12, 20, 40, 100]

const pool = [...SYMBOLS, SCATTER]
const totalW = pool.reduce((s, x) => s + x.w, 0)
let uid = 0
function randTile(col) {
  let r = Math.random() * totalW
  let sym = pool[pool.length - 1]
  for (const p of pool) { if ((r -= p.w) < 0) { sym = p; break } }
  // golden tiles only on middle reels
  const gold = col >= 1 && col <= 3 && sym.id !== 'hu' && Math.random() < 0.18
  return { key: ++uid, sym, gold }
}
const newGrid = () => Array.from({ length: COLS }, (_, c) => Array.from({ length: ROWS }, () => randTile(c)))

function evaluate(grid, bet) {
  let win = 0
  const hits = new Set()
  for (const s of SYMBOLS) {
    let ways = 1, reels = 0
    const cells = []
    for (let c = 0; c < COLS; c++) {
      const m = grid[c].map((t, r) => [t, r]).filter(([t]) => t.sym.id === s.id || t.sym.id === 'wild')
      if (!m.length) break
      reels++; ways *= m.length
      m.forEach(([, r]) => cells.push(`${c}-${r}`))
    }
    if (reels >= 3) {
      win += (bet / 20) * s.pay[reels] * ways
      cells.forEach(k => hits.add(k))
    }
  }
  return { win, hits }
}
const sleep = ms => new Promise(r => setTimeout(r, ms))

function Tile({ t, hit }) {
  const isWild = t.sym.id === 'wild'
  const bg = isWild ? 'linear-gradient(#ffe680,#f2b705)' : t.gold ? 'linear-gradient(#fff3a8,#f5c518)' : 'linear-gradient(#ffffff,#e9e4dc)'
  return (
    <div style={{
      height: 84, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: hit ? '0 0 0 3px #fff, 0 0 18px 6px #ffd400' : '0 4px 0 #b9ac98', transition: 'box-shadow .2s, opacity .2s',
      opacity: hit ? 0.85 : 1, fontWeight: 900, fontFamily: '"Noto Serif SC", serif', color: t.sym.color,
      fontSize: isWild ? 20 : t.sym.ch.length > 1 ? 24 : 40, lineHeight: 1, letterSpacing: isWild ? 1 : 0,
      whiteSpace: 'pre-line', textAlign: 'center',
    }}>{t.sym.ch}</div>
  )
}

export default function App() {
  const [grid, setGrid] = useState(newGrid)
  const [hits, setHits] = useState(new Set())
  const [balance, setBalance] = useState(100000)
  const [betIdx, setBetIdx] = useState(3)
  const [multStep, setMultStep] = useState(0)
  const [free, setFree] = useState(0)
  const [lastWin, setLastWin] = useState(0)
  const [banner, setBanner] = useState('3 SCATTER 胡 MEMICU 10 FREE SPINS')
  const [busy, setBusy] = useState(false)
  const freeRef = useRef(0)
  const bet = BETS[betIdx]

  async function spin() {
    if (busy) return
    const inFree = freeRef.current > 0
    if (!inFree && balance < bet) return setBanner('SALDO TIDAK CUKUP')
    setBusy(true)
    if (inFree) { freeRef.current--; setFree(freeRef.current) } else setBalance(b => b - bet)
    const mults = inFree ? FREE_MULT : NORMAL_MULT
    let g = newGrid(), step = 0, total = 0
    setMultStep(0); setHits(new Set()); setLastWin(0); setGrid(g)
    setBanner(inFree ? `FREE SPIN — sisa ${freeRef.current}` : 'SEMOGA BERUNTUNG!')
    await sleep(450)
    while (true) {
      const { win, hits: h } = evaluate(g, bet)
      if (!win) break
      const m = mults[Math.min(step, 3)]
      total += win * m
      setHits(h); setLastWin(total); setBanner(`MENANG ${(win * m).toFixed(2)} (x${m})`)
      await sleep(700)
      // cascade: gold winners -> wild, others removed and refilled from top
      g = g.map((col, c) => {
        const transformed = col.map((t, r) => h.has(`${c}-${r}`) && t.gold ? { key: ++uid, sym: WILD, gold: false } : t)
        const remain = transformed.filter((t, r) => !(h.has(`${c}-${r}`) && !col[r].gold))
        return [...Array.from({ length: ROWS - remain.length }, () => randTile(c)), ...remain]
      })
      step++; setMultStep(Math.min(step, 3)); setHits(new Set()); setGrid(g)
      await sleep(450)
    }
    const scatters = g.flat().filter(t => t.sym.id === 'hu').length
    if (scatters >= 3) {
      const add = 10 + (scatters - 3) * 2
      freeRef.current += add; setFree(freeRef.current)
      setBanner(`${scatters} SCATTER! +${add} FREE SPINS`)
    } else if (total) setBanner(`TOTAL MENANG ${total.toFixed(2)}`)
    else if (!inFree) setBanner('3 SCATTER 胡 MEMICU 10 FREE SPINS')
    setBalance(b => b + total)
    setBusy(false)
  }

  const mults = free > 0 ? FREE_MULT : NORMAL_MULT
  const circle = (extra = {}) => ({ width: 52, height: 52, borderRadius: '50%', border: 'none', background: '#8a3b1c', color: '#fff', fontSize: 26, cursor: 'pointer', ...extra })

  return (
    <div style={{ minHeight: '100vh', background: '#3a0d0d', display: 'flex', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 520, background: 'radial-gradient(circle at 50% 30%, #f07a5a, #c9452e)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', color: '#ffe9b0', fontWeight: 800, letterSpacing: 2, paddingTop: 12, fontSize: 14 }}>MAHJONG DEMO · 1024 WAYS</div>
        <div style={{ margin: '8px 12px', background: '#1f7a6a', borderRadius: 12, display: 'flex', justifyContent: 'space-around', padding: '6px 0', border: '2px solid #ffe9b0' }}>
          {mults.map((m, i) => (
            <span key={i} style={{ fontSize: 32, fontWeight: 900, fontStyle: 'italic', color: i === multStep ? '#ffd400' : '#0d3f36', textShadow: i === multStep ? '0 0 10px #fff3a0' : 'none' }}>x{m}</span>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 8, padding: '8px 14px' }}>
          {grid.map((col, c) => (
            <div key={c} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {col.map((t, r) => <Tile key={t.key} t={t} hit={hits.has(`${c}-${r}`)} />)}
            </div>
          ))}
        </div>
        <div style={{ margin: '8px 12px', background: '#9e1b2a', color: '#ffe9b0', borderRadius: 10, padding: '10px 8px', textAlign: 'center', fontWeight: 800, letterSpacing: 1, border: '2px solid #e8b04a' }}>
          {free > 0 ? `FREE SPINS: ${free} · ` : ''}{banner}
        </div>
        <div style={{ background: '#8f3a1e', marginTop: 'auto', padding: '12px 14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, color: '#ffe9b0', fontWeight: 700 }}>
            <div style={{ flex: 1, background: '#5e2412', borderRadius: 20, padding: '8px 14px' }}>Saldo: {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <div style={{ flex: 1, background: '#5e2412', borderRadius: 20, padding: '8px 14px', textAlign: 'right' }}>Taruhan: {bet.toFixed(2)}</div>
          </div>
          <div style={{ color: '#ffe9b0', textAlign: 'center', fontSize: 14 }}>Menang: <b>{lastWin.toFixed(2)}</b></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
            <button aria-label="Kurangi taruhan" style={circle()} disabled={busy || free > 0} onClick={() => setBetIdx(i => Math.max(0, i - 1))}>−</button>
            <button aria-label="Putar" onClick={spin} disabled={busy} style={circle({ width: 92, height: 92, background: '#1f9a6e', border: '5px solid #f2c94c', fontSize: 40, opacity: busy ? 0.7 : 1 })}>⟳</button>
            <button aria-label="Tambah taruhan" style={circle()} disabled={busy || free > 0} onClick={() => setBetIdx(i => Math.min(BETS.length - 1, i + 1))}>+</button>
          </div>
          <div style={{ color: '#f3c9a8', fontSize: 11, textAlign: 'center' }}>Demo hiburan — kredit virtual, tanpa uang sungguhan.</div>
        </div>
      </div>
    </div>
  )
}
