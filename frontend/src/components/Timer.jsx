import { useEffect, useState, useRef } from 'react'
import { gsap } from 'gsap'
import axios from 'axios'

export default function Timer({ sessionId, onExpire }) {
  const [remaining, setRemaining] = useState(null)
  const barRef = useRef()
  const totalRef = useRef(null)

  useEffect(() => {
    if (!sessionId) return
    const poll = async () => {
      const { data } = await axios.get(`/api/sessions/${sessionId}/status`)
      if (data.remaining_seconds !== undefined) {
        const sec = Math.max(0, Math.floor(data.remaining_seconds))
        if (totalRef.current === null) totalRef.current = sec
        setRemaining(sec)
        if (sec <= 0) onExpire?.()
      }
    }
    poll()
    const t = setInterval(poll, 10000)
    return () => clearInterval(t)
  }, [sessionId])

  useEffect(() => {
    if (remaining !== null && barRef.current && totalRef.current) {
      const pct = remaining / totalRef.current
      gsap.to(barRef.current, { width: `${pct * 100}%`, duration: 0.5, ease: 'none' })
      if (remaining < 600) {
        gsap.to(barRef.current, { background: '#c84c4c', duration: 0.5 })
      }
    }
  }, [remaining])

  if (remaining === null) return null

  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60
  const fmt = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`

  return (
    <div style={styles.wrap}>
      <div style={styles.time}>{fmt}</div>
      <div style={styles.track}>
        <div ref={barRef} style={styles.bar} />
      </div>
    </div>
  )
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' },
  time: { fontSize: '13px', color: '#c9a84c', fontFamily: 'Inter, sans-serif', letterSpacing: '0.1em' },
  track: { width: '80px', height: '2px', background: '#1a1808', borderRadius: '1px', overflow: 'hidden' },
  bar: { height: '100%', width: '100%', background: '#c9a84c', borderRadius: '1px' },
}
