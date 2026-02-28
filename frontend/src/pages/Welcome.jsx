import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { gsap } from 'gsap'
import axios from 'axios'

import API from '../api'

export default function Welcome() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [user, setUser] = useState(null)
  const [step, setStep] = useState('choose') // choose | paying | ready
  const [duration, setDuration] = useState(1)
  const [session, setSession] = useState(null)
  const cardRef = useRef()

  useEffect(() => {
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 60, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'power3.out' }
    )
    const token = params.get('token') || localStorage.getItem('zenpod_token')
    if (token) loadUser(token)
  }, [])

  const loadUser = async (token) => {
    try {
      const { data } = await axios.get(`${API}/users/token/${token}`)
      setUser(data)
      localStorage.setItem('zenpod_token', token)
    } catch { }
  }

  const createNewUser = async () => {
    const { data } = await axios.post(`${API}/users/`)
    setUser(data)
    localStorage.setItem('zenpod_token', data.token)
    return data
  }

  const startSession = async () => {
    setStep('paying')
    let u = user
    if (!u) u = await createNewUser()
    const { data } = await axios.post(`${API}/sessions/`, {
      duration_hours: duration,
      user_token: u.token
    })
    // Demo模式直接激活
    await axios.post(`${API}/sessions/${data.session_id}/activate`)
    setSession({ ...data, session_id: data.session_id })
    setStep('ready')
  }

  const enterReader = () => {
    nav(`/reader?session=${session.session_id}&token=${user?.token || ''}`)
  }

  return (
    <div style={styles.bg}>
      <div ref={cardRef} style={styles.card}>

        {/* 顶部品牌 */}
        <div style={styles.brand}>
          <span style={styles.logo}>禅境</span>
          <span style={styles.logoEn}>ZenPod</span>
        </div>

        {/* 用户问候 */}
        {user && (
          <div style={styles.greeting}>
            欢迎回来，{user.nickname} · 已修行 {user.total_minutes} 分钟
          </div>
        )}

        {step === 'choose' && (
          <>
            <p style={styles.hint}>选择今日修行时长</p>
            <div style={styles.options}>
              {[1, 2].map(h => (
                <button key={h} onClick={() => setDuration(h)}
                  style={{ ...styles.optBtn, ...(duration === h ? styles.optActive : {}) }}>
                  <span style={styles.optHours}>{h}</span>
                  <span style={styles.optLabel}>小时</span>
                  <span style={styles.optPrice}>¥{h === 1 ? 28 : 56}</span>
                </button>
              ))}
            </div>

            <button style={styles.payBtn} onClick={startSession}>
              {user ? '继续修行（Demo）' : '开始修行（Demo）'}
            </button>

            <p style={styles.demoNote}>* 当前为体验模式，无需实际支付</p>

            {!user && (
              <p style={styles.newUserNote}>
                首次使用将自动创建您的修行档案，下次可凭二维码继续
              </p>
            )}
          </>
        )}

        {step === 'paying' && (
          <div style={styles.loading}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>正在开启禅境…</p>
          </div>
        )}

        {step === 'ready' && (
          <div style={styles.readyWrap}>
            <div style={styles.checkmark}>✦</div>
            <p style={styles.readyText}>禅境已开启</p>
            <p style={styles.readyDuration}>{duration} 小时修行时间</p>
            <button style={styles.enterBtn} onClick={enterReader}>
              进入禅境 →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  bg: {
    minHeight: '100vh', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at 50% 30%, #0f0a1e, #050508)',
  },
  card: {
    width: 'min(460px, 90vw)',
    padding: '48px 40px',
    background: '#0f0f1e',
    border: '1px solid #c9a84c33',
    borderRadius: '4px',
    boxShadow: '0 0 60px #c9a84c18',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
  },
  brand: { display: 'flex', alignItems: 'baseline', gap: '12px' },
  logo: { fontSize: '36px', color: '#f0d080', fontWeight: 700, letterSpacing: '0.1em', textShadow: '0 0 20px #c9a84c66' },
  logoEn: { fontSize: '14px', color: '#c9a84c', letterSpacing: '0.3em', fontFamily: 'Inter, sans-serif' },
  greeting: { fontSize: '13px', color: '#a09070', letterSpacing: '0.1em' },
  hint: { fontSize: '14px', color: '#7a7060', letterSpacing: '0.15em', marginTop: '8px' },
  options: { display: 'flex', gap: '16px', width: '100%' },
  optBtn: {
    flex: 1, padding: '24px 16px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
    background: 'transparent', border: '1px solid #3a3020',
    borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s',
  },
  optActive: { border: '1px solid #c9a84c', background: '#c9a84c0f', boxShadow: '0 0 20px #c9a84c22' },
  optHours: { fontSize: '36px', color: '#f0d080', fontWeight: 700 },
  optLabel: { fontSize: '13px', color: '#a09070' },
  optPrice: { fontSize: '14px', color: '#c9a84c', marginTop: '4px' },
  payBtn: {
    width: '100%', padding: '15px',
    background: 'linear-gradient(135deg, #2a1f00, #1a1408)',
    border: '1px solid #c9a84c',
    borderRadius: '2px', cursor: 'pointer',
    color: '#f0d080', fontSize: '15px', letterSpacing: '0.25em',
    fontFamily: "'Noto Serif SC', serif",
    transition: 'all 0.2s',
  },
  demoNote: { fontSize: '11px', color: '#4a4030', letterSpacing: '0.1em' },
  newUserNote: { fontSize: '11px', color: '#5a5040', textAlign: 'center', letterSpacing: '0.05em', lineHeight: 1.6 },
  loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '40px 0' },
  spinner: {
    width: '40px', height: '40px',
    border: '2px solid #3a3020', borderTop: '2px solid #c9a84c',
    borderRadius: '50%', animation: 'spin 1s linear infinite',
  },
  loadingText: { color: '#a09070', letterSpacing: '0.2em', fontSize: '14px' },
  readyWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '20px 0' },
  checkmark: { fontSize: '40px', color: '#f0d080', textShadow: '0 0 30px #c9a84c' },
  readyText: { fontSize: '18px', color: '#f0d080', letterSpacing: '0.2em' },
  readyDuration: { fontSize: '13px', color: '#a09070' },
  enterBtn: {
    marginTop: '8px', padding: '14px 40px',
    background: '#c9a84c22', border: '1px solid #c9a84c',
    borderRadius: '2px', cursor: 'pointer',
    color: '#f0d080', fontSize: '15px', letterSpacing: '0.25em',
    fontFamily: "'Noto Serif SC', serif",
  },
}
