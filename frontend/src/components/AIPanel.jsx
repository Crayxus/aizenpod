import { useEffect, useState, useRef } from 'react'
import { gsap } from 'gsap'
import axios from 'axios'

import API from '../api'

export default function AIPanel({ text, mode, onClose }) {
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [question, setQuestion] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const panelRef = useRef()
  const progressRef = useRef()

  useEffect(() => {
    gsap.fromTo(panelRef.current,
      { x: 60, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }
    )
    if (mode === 'explain') fetchExplain()
    return () => window.speechSynthesis.cancel()
  }, [text, mode])

  const fetchExplain = async () => {
    setLoading(true)
    setAnswer('')
    setProgress(0)
    // Animate progress bar to 85% while waiting
    progressRef.current = gsap.to({}, {
      duration: 8, ease: 'power1.out',
      onUpdate: function() { setProgress(Math.floor(this.progress() * 85)) }
    })
    const { data } = await axios.post(`${API}/ai/explain`, { text, context: '' })
    // Complete the bar
    progressRef.current?.kill()
    setProgress(100)
    setTimeout(() => { setAnswer(data.answer); setLoading(false); setProgress(0) }, 300)
  }

  const askQuestion = async () => {
    if (!question.trim()) return
    setLoading(true)
    setAnswer('')
    const { data } = await axios.post(`${API}/ai/ask`, { question, scripture_text: text })
    setAnswer(data.answer)
    setLoading(false)
  }

  const speakAnswer = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }
    if (!answer) return
    const utterance = new SpeechSynthesisUtterance(answer)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.85
    utterance.pitch = 0.9
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    setIsSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  const close = () => {
    window.speechSynthesis.cancel()
    gsap.to(panelRef.current, { x: 60, opacity: 0, duration: 0.3, onComplete: onClose })
  }

  return (
    <div ref={panelRef} style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>✦ 慧明法师</span>
        <div style={styles.headerActions}>
          {!loading && answer && (
            <button onClick={speakAnswer} style={styles.speakBtn}>
              {isSpeaking ? '⏸ 停止' : '▶ 朗读'}
            </button>
          )}
          <button onClick={close} style={styles.closeBtn}>✕</button>
        </div>
      </div>

      <div style={styles.textBlock}>
        <p style={styles.textLabel}>经文</p>
        <p style={styles.textContent}>「{text.slice(0, 80)}{text.length > 80 ? '…' : ''}」</p>
      </div>

      {/* Progress bar */}
      {loading && progress > 0 && (
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressBar, width: `${progress}%` }} />
        </div>
      )}

      {mode === 'ask' && (
        <div style={styles.askBlock}>
          <input
            style={styles.input}
            placeholder="请问慧明法师…"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && askQuestion()}
          />
          <button style={styles.askBtn} onClick={askQuestion}>请教</button>
        </div>
      )}

      <div style={styles.answer}>
        {loading ? (
          <div style={styles.loadingWrap}>
            <div style={styles.dots}>
              {[0, 1, 2].map(i => <span key={i} style={{ ...styles.dot, animationDelay: `${i * 0.2}s` }} />)}
            </div>
            <span style={styles.loadingText}>慧明法师正在思索…</span>
          </div>
        ) : (
          <p style={styles.answerText}>{answer}</p>
        )}
      </div>

      {!loading && answer && (
        <div style={styles.footer}>
          <button style={styles.reaskBtn} onClick={fetchExplain}>重新解释</button>
        </div>
      )}
    </div>
  )
}

const styles = {
  panel: {
    position: 'fixed', right: 0, top: 0, bottom: 0,
    width: 'min(380px, 90vw)',
    background: '#0c0c18',
    borderLeft: '1px solid #c9a84c33',
    boxShadow: '-20px 0 60px #00000088',
    display: 'flex', flexDirection: 'column',
    zIndex: 100, overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 24px', borderBottom: '1px solid #c9a84c1a',
  },
  headerActions: { display: 'flex', alignItems: 'center', gap: '12px' },
  title: { color: '#f0d080', fontSize: '16px', letterSpacing: '0.2em' },
  speakBtn: {
    background: 'transparent', border: '1px solid #c9a84c55',
    borderRadius: '2px', color: '#c9a84c',
    padding: '4px 12px', cursor: 'pointer',
    fontSize: '12px', letterSpacing: '0.1em',
    fontFamily: "'Noto Serif SC', serif",
  },
  closeBtn: { background: 'none', border: 'none', color: '#5a5040', cursor: 'pointer', fontSize: '16px' },
  textBlock: { padding: '20px 24px', borderBottom: '1px solid #1a1808' },
  textLabel: { fontSize: '10px', color: '#5a5040', letterSpacing: '0.3em', marginBottom: '8px' },
  textContent: { fontSize: '13px', color: '#a09070', lineHeight: 1.8, letterSpacing: '0.05em' },
  askBlock: { padding: '16px 24px', display: 'flex', gap: '8px', borderBottom: '1px solid #1a1808' },
  input: {
    flex: 1, padding: '10px 14px',
    background: '#0a0a14', border: '1px solid #3a3020',
    borderRadius: '2px', color: '#d4c090', fontSize: '13px',
    fontFamily: "'Noto Serif SC', serif", outline: 'none',
  },
  askBtn: {
    padding: '10px 16px', background: '#c9a84c1a',
    border: '1px solid #c9a84c', borderRadius: '2px',
    color: '#c9a84c', cursor: 'pointer', fontSize: '13px',
    fontFamily: "'Noto Serif SC', serif",
  },
  answer: { flex: 1, overflowY: 'auto', padding: '24px' },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', paddingTop: '40px' },
  dots: { display: 'flex', gap: '8px' },
  dot: {
    width: '6px', height: '6px', borderRadius: '50%',
    background: '#c9a84c', display: 'inline-block',
    animation: 'pulse 1.2s ease-in-out infinite',
  },
  loadingText: { color: '#5a5040', fontSize: '12px', letterSpacing: '0.2em' },
  progressTrack: {
    height: '2px', background: '#1a1808',
    margin: '0', flexShrink: 0,
  },
  progressBar: {
    height: '100%', background: 'linear-gradient(90deg, #7a6030, #f0d080, #c9a84c)',
    transition: 'width 0.1s ease', borderRadius: '1px',
    boxShadow: '0 0 8px #c9a84c88',
  },
  answerText: { fontSize: '14px', color: '#c8bca0', lineHeight: 2.2, letterSpacing: '0.06em', whiteSpace: 'pre-wrap' },
  footer: { padding: '0 24px 24px', display: 'flex', gap: '8px' },
  reaskBtn: {
    flex: 1, padding: '10px',
    background: 'transparent', border: '1px solid #2a2818',
    borderRadius: '2px', color: '#7a7060',
    cursor: 'pointer', fontSize: '12px', letterSpacing: '0.15em',
    fontFamily: "'Noto Serif SC', serif",
  },
}
