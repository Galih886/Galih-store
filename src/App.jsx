import { useState, useRef, useEffect } from 'react'
import {
  COLS, BETS, NORMAL_MULT, FREE_MULT, loadSettings, saveSettings, DEFAULT_SETTINGS,
  newGrid, evaluate, cascade, countScatter, freeSpinsFor, simulate,
} from './game.js'

const sleep = ms => new Promise(r => setTimeout(r, ms))
const fmt = n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const TILE_H = 74

function Tile({ t, hit }) {
  const wild = t.sym.id === 'wild'
  const scatter = t.sym.id === 'hu'
  const bg = wild || t.gold ? 'linear-gradient(#fff6b8,#f6c21c 70%,#e0a000)' : 'linear-gradient(#ffffff,#ece6dc)'
  return (
    <div style={{
      height: TILE_H, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: hit ? '0 0 0 3px #fff, 0 0 20px 8px #ffd400' : '0 5px 0 #b9ac98, inset 0 -2px 0 #d8cfc0',
      transition: 'box-shadow .2s', fontWeight: 900, fontFamily: '"Noto Serif SC","Songti SC",serif', color: t.sym.color,
      fontSize: wild ? 18 : scatter ? 44 : t.sym.ch.length > 2 ? 18 : 38, lineHeight: 1.05,
      whiteSpace: 'pre-line', textAlign: 'center', textShadow: scatter ? '0 0 6px #ffb3a0' : 'none',
    }}>
      {wild ? <span>WILD<br /><span style={{ fontSize: 26 }}>💰</span></span> : t.sym.ch}
    </div>
  )
}

function Game() {
  const [s] = useState(loadSettings)
  const [grid, setGrid] = useState(() => newGrid(s))
  const [hits, setHits] = useState(new Set())
  const [balance, setBalance] = useState(Number(s.startBalance))
  const [betIdx, setBetIdx] = useState(4)
  const [multStep, setMultStep] = useState(0)
  const [free, setFree] = useState(0)
  const [lastWin, setLastWin] = useState(0)
  const [banner, setBanner] = useState(`${s.minScatter} SCATTER TRIGGERS ${s.freeSpins} OR MORE FREE SPINS`)
  const [busy, setBusy] = useState(false)
  const [turbo, setTurbo] = useState(false)
  const [auto, setAuto] = useState(false)
  const freeRef = useRef(0)
  const bet = BETS[betIdx]
  const speed = turbo ? 0.4 : 1

  async function spin() {
    if (busy) return
    const inFree = freeRef.current > 0
    if (!inFree && balance < bet) { setAuto(false); return setBanner('SALDO TIDAK CUKUP') }
    setBusy(true)
    if (inFree) { freeRef.current--; setFree(freeRef.current) } else setBalance(b => b - bet)
    const mults = inFree ? FREE_MULT : NORMAL_MULT
    let g = newGrid(s), step = 0, total = 0
    setMultStep(0); setHits(new Set()); setLastWin(0); setGrid(g)
    setBanner(inFree ? `FREE SPINS LEFT: ${freeRef.current}` : 'GOOD LUCK!')
    await sleep(450 * speed)
    for (;;) {
      const { win, hits: h } = evaluate(g, bet, s)
      if (!win) break
      const m = mults[Math.min(step, 3)]
      total += win * m
      setHits(h); setLastWin(total); setBanner(`WIN ${fmt(win * m)}  (x${m})`)
      await sleep(750 * speed)
      g = cascade(g, h, s); step++
      setMultStep(Math.min(step, 3)); setHits(new Set()); setGrid(g)
      await sleep(450 * speed)
    }
    const add = freeSpinsFor(countScatter(g), s)
    if (add) { freeRef.current += add; setFree(freeRef.current); setBanner(`+${add} FREE SPINS!`) }
    else if (total) setBanner(`TOTAL WIN ${fmt(total)}`)
    else if (!inFree) setBanner(`${s.minScatter} SCATTER TRIGGERS ${s.freeSpins} OR MORE FREE SPINS`)
    setBalance(b => b + total)
    setBusy(false)
  }

  useEffect(() => {
    if ((auto || free > 0) && !busy) { const t = setTimeout(spin, 500 * speed); return () => clearTimeout(t) }
  }) // eslint-disable-line

  const mults = free > 0 ? FREE_MULT : NORMAL_MULT
  const round = (extra = {}) => ({ width: 50, height: 50, borderRadius: '50%', border: 'none', background: '#7a2e14', color: '#ffe9c4', fontSize: 24, cursor: 'pointer', ...extra })
  const pill = { flex: 1, background: '#5a200e', borderRadius: 22, padding: '9px 14px', color: '#ffe9c4', fontWeight: 600, fontSize: 15 }

  return (
    <div style={{ minHeight: '100vh', background: '#2b0a08', display: 'flex', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 520, background: 'radial-gradient(ellipse at 50% 40%, #f48b6a, #d0553c 70%)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: -40, top: 60, fontSize: 120, opacity: .25 }}>🐉</div>
        <div style={{ position: 'absolute', right: -40, bottom: 260, fontSize: 120, opacity: .25, transform: 'scaleX(-1)' }}>🐉</div>

        <div style={{ textAlign: 'center', color: '#b8452e', fontWeight: 900, letterSpacing: 2, paddingTop: 10, fontSize: 22, fontStyle: 'italic' }}>◈ 2000 WAYS ◈</div>
        <div style={{ margin: '4px 10px 6px', background: 'linear-gradient(#2e9c86,#1d7564)', borderRadius: 14, display: 'flex', justifyContent: 'space-around', padding: '4px 0', border: '2px solid #ffe2a0', position: 'relative' }}>
          {mults.map((m, i) => (
            <span key={i} style={{ fontSize: 36, fontWeight: 900, fontStyle: 'italic', fontFamily: 'Georgia, serif', color: i === multStep ? '#ffd83a' : '#0f4a3e', textShadow: i === multStep ? '0 0 10px #fff3a0, 0 2px 0 #a06a00' : 'none' }}>x{m}</span>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 7, padding: '6px 12px', position: 'relative' }}>
          {grid.map((col, c) => (
            <div key={c} style={{ display: 'flex', flexDirection: 'column', gap: 7, justifyContent: 'center' }}>
              {col.map((t, r) => <Tile key={t.key} t={t} hit={hits.has(`${c}-${r}`)} />)}
            </div>
          ))}
        </div>

        <div style={{ margin: '6px 10px', background: 'linear-gradient(#b4202e,#8a1422)', color: '#ffe9c4', borderRadius: 8, padding: '10px 8px', textAlign: 'center', fontWeight: 900, letterSpacing: 1, border: '2px solid #e8b04a', fontFamily: 'Georgia, serif', fontSize: 17 }}>
          {free > 0 && !banner.startsWith('FREE') ? `FREE SPINS: ${free} · ` : ''}{banner}
        </div>

        <div style={{ background: 'linear-gradient(#a2492a,#7c3218)', marginTop: 'auto', padding: '12px 12px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={pill}>👤 {fmt(balance)}</div>
            <div style={{ ...pill, flex: '0 0 70px', textAlign: 'center', fontWeight: 900, color: '#d9a07a' }}>MJ</div>
            <div style={{ ...pill, textAlign: 'right' }}>{fmt(bet)} 💲</div>
          </div>
          <div style={{ color: '#ffe9c4', textAlign: 'center', fontSize: 14, minHeight: 18 }}>{lastWin ? <>WIN <b>{fmt(lastWin)}</b></> : ' '}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
            <button aria-label="Turbo" title="Turbo" onClick={() => setTurbo(v => !v)} style={round({ color: turbo ? '#ffd83a' : '#ffe9c4' })}>⚡</button>
            <button aria-label="Kurangi taruhan" style={round()} disabled={busy || free > 0} onClick={() => setBetIdx(i => Math.max(0, i - 1))}>−</button>
            <button aria-label="Putar" onClick={spin} disabled={busy || auto || free > 0} style={round({ width: 96, height: 96, background: 'radial-gradient(#3fcf98,#17845c)', border: '6px solid #f2c94c', fontSize: 46, opacity: busy ? 0.8 : 1 })}>⟳</button>
            <button aria-label="Tambah taruhan" style={round()} disabled={busy || free > 0} onClick={() => setBetIdx(i => Math.min(BETS.length - 1, i + 1))}>+</button>
            <button aria-label="Auto spin" title="Auto spin" onClick={() => setAuto(v => !v)} style={round({ color: auto ? '#ffd83a' : '#ffe9c4' })}>{auto ? '■' : '▶'}</button>
          </div>
          <div style={{ color: '#f3c9a8', fontSize: 11, textAlign: 'center' }}>Demo hiburan — kredit virtual, tanpa uang sungguhan.</div>
        </div>
      </div>
    </div>
  )
}

const FIELDS = [
  ['payoutScale', 'Skala pembayaran (%)', 'Pengali semua hadiah simbol. Kenop utama RTP.', 0, 500, 1],
  ['scatterWeight', 'Bobot scatter 胡', 'Makin besar, makin sering scatter muncul.', 0, 10, 0.1],
  ['minScatter', 'Scatter minimal untuk free spin', '', 2, 6, 1],
  ['freeSpins', 'Jumlah free spin', 'Diberikan saat scatter minimal tercapai.', 0, 100, 1],
  ['extraPerScatter', 'Free spin tambahan per scatter ekstra', '', 0, 20, 1],
  ['goldChance', 'Peluang ubin emas (%)', 'Ubin emas yang menang berubah jadi WILD.', 0, 100, 1],
  ['startBalance', 'Saldo awal demo', '', 0, 10000000, 100],
]

function Admin() {
  const [s, setS] = useState(loadSettings)
  const [saved, setSaved] = useState(false)
  const [sim, setSim] = useState(null)
  const set = (k, v) => { setS(p => ({ ...p, [k]: v === '' ? '' : Number(v) })); setSaved(false); setSim(null) }
  const input = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #3a3f5c', background: '#12152a', color: '#fff', fontSize: 15, boxSizing: 'border-box' }
  const btn = (primary) => ({ padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, background: primary ? '#f5b301' : '#2a2f45', color: primary ? '#1a1a1a' : '#fff' })

  return (
    <div style={{ minHeight: '100vh', background: '#0d1020', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: 24, boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 24 }}>Panel Admin Demo</h1>
          <a href="#/" style={{ color: '#f5b301' }}>← Ke game</a>
        </div>
        <p style={{ margin: 0, color: '#a8adc7', fontSize: 14 }}>Atur parameter game demo. Disimpan di browser ini (localStorage) dan berlaku setelah game dimuat ulang.</p>
        <div style={{ background: '#1c2038', borderRadius: 12, padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {FIELDS.map(([k, label, hint, min, max, step]) => (
            <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
              <span style={{ fontWeight: 600 }}>{label}</span>
              <input type="number" min={min} max={max} step={step} value={s[k]} onChange={e => set(k, e.target.value)} style={input} />
              {hint && <span style={{ color: '#8a90ad', fontSize: 12 }}>{hint}</span>}
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={btn(true)} onClick={() => { saveSettings(s); setSaved(true) }}>Simpan</button>
          <button style={btn(false)} onClick={() => setSim(simulate(s))}>Hitung perkiraan RTP</button>
          <button style={btn(false)} onClick={() => { setS({ ...DEFAULT_SETTINGS }); setSaved(false); setSim(null) }}>Reset default</button>
          {saved && <span style={{ alignSelf: 'center', color: '#5fd38d' }}>Tersimpan ✓</span>}
        </div>
        {sim && (
          <div style={{ background: '#1c2038', borderRadius: 12, padding: 20, display: 'flex', gap: 32 }}>
            <div><div style={{ color: '#a8adc7', fontSize: 13 }}>Perkiraan RTP</div><div style={{ fontSize: 28, fontWeight: 800 }}>{sim.rtp.toFixed(1)}%</div></div>
            <div><div style={{ color: '#a8adc7', fontSize: 13 }}>Free spin rata-rata tiap</div><div style={{ fontSize: 28, fontWeight: 800 }}>{Math.round(sim.hitFree)} spin</div></div>
          </div>
        )}
        <p style={{ margin: 0, color: '#8a90ad', fontSize: 12 }}>Perkiraan dari simulasi 10.000 spin; hasil bisa sedikit berbeda tiap kali dihitung.</p>
      </div>
    </div>
  )
}

export default function App() {
  const [route, setRoute] = useState(location.hash)
  useEffect(() => { const f = () => setRoute(location.hash); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  return route.startsWith('#/admin') ? <Admin /> : <Game key={route} />
}
