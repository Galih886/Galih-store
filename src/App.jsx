import { useState } from 'react'

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎', '7️⃣']
const PAYOUT = { '🍒': 2, '🍋': 3, '🍊': 4, '🍇': 5, '🔔': 8, '⭐': 10, '💎': 20, '7️⃣': 50 }
const BETS = [10, 50, 100]
const START = 1000
const rand = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]

export default function App() {
  const [reels, setReels] = useState(['7️⃣', '7️⃣', '7️⃣'])
  const [credit, setCredit] = useState(START)
  const [bet, setBet] = useState(10)
  const [spinning, setSpinning] = useState(false)
  const [msg, setMsg] = useState('Tekan PUTAR untuk mulai')

  const spin = () => {
    if (spinning || credit < bet) return
    setSpinning(true)
    setCredit(c => c - bet)
    setMsg('Berputar...')
    let n = 0
    const t = setInterval(() => {
      setReels([rand(), rand(), rand()])
      if (++n >= 15) {
        clearInterval(t)
        const r = [rand(), rand(), rand()]
        setReels(r)
        let win = 0
        if (r[0] === r[1] && r[1] === r[2]) win = bet * PAYOUT[r[0]]
        else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) win = bet
        setCredit(c => c + win)
        setMsg(win ? `Menang ${win} kredit!` : 'Coba lagi')
        setSpinning(false)
      }
    }, 70)
  }

  const btn = (active) => ({ padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, background: active ? '#f5b301' : '#2a2f45', color: active ? '#1a1a1a' : '#fff' })

  return (
    <div style={{ minHeight: '100vh', background: '#12152a', color: '#fff', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#1c2038', borderRadius: 16, padding: 32, display: 'flex', flexDirection: 'column', gap: 24, textAlign: 'center' }}>
        <div>
          <h1 style={{ margin: 0, color: '#f5b301' }}>Galih Slot Demo</h1>
          <p style={{ margin: '8px 0 0', color: '#a8adc7', fontSize: 14 }}>Mode demo, pakai kredit virtual tanpa uang sungguhan</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {reels.map((s, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 12, fontSize: 56, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s}</div>
          ))}
        </div>
        <div style={{ fontSize: 18, minHeight: 24 }}>{msg}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}>
          <span>Kredit: <b>{credit}</b></span><span>Taruhan: <b>{bet}</b></span>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {BETS.map(b => <button key={b} style={btn(b === bet)} onClick={() => setBet(b)} disabled={spinning}>{b}</button>)}
        </div>
        <button onClick={spin} disabled={spinning || credit < bet} style={{ ...btn(true), fontSize: 20, padding: 16, opacity: spinning || credit < bet ? 0.6 : 1 }}>PUTAR</button>
        {credit < bet && !spinning && <button style={btn(false)} onClick={() => { setCredit(START); setMsg('Kredit diisi ulang') }}>Isi ulang kredit demo</button>}
        <div style={{ fontSize: 12, color: '#a8adc7' }}>3 sama: taruhan × pengali (🍒2 … 7️⃣50) · 2 sama: taruhan kembali</div>
      </div>
    </div>
  )
}
