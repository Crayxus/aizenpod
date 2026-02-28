import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import axios from 'axios'
import Timer from '../components/Timer'
import AIPanel from '../components/AIPanel'

import API from '../api'

export default function Reader() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const sessionId = params.get('session')
  const token = params.get('token')

  const [scriptures, setScriptures] = useState([])
  const [selected, setSelected] = useState(null)
  const [chapter, setChapter] = useState(null)
  const [aiPanel, setAiPanel] = useState(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [lastProgress, setLastProgress] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const contentRef = useRef()
  const mainRef = useRef()
  const keepAliveRef = useRef(null)
  const voicesRef = useRef([])

  // Pre-load voices (critical for mobile — getVoices() returns [] until voiceschanged fires)
  useEffect(() => {
    const loadVoices = () => { voicesRef.current = window.speechSynthesis.getVoices() }
    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
  }, [])

  useEffect(() => {
    gsap.fromTo(mainRef.current, { opacity: 0 }, { opacity: 1, duration: 0.8 })
    loadScriptures()
    if (token) loadProgress()
  }, [])

  const loadScriptures = async () => {
    try {
      const { data } = await axios.get(`${API}/scriptures/`)
      setScriptures(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load scriptures:', err)
      setScriptures([])
    }
  }

  const loadProgress = async () => {
    try {
      const { data } = await axios.get(`${API}/users/token/${token}/progress`)
      if (data.length > 0) setLastProgress(data[0])
    } catch { }
  }

  const openScripture = async (id) => {
    try {
      const { data } = await axios.get(`${API}/scriptures/${id}`)
      setSelected(data)
      setSidebarOpen(false)
      if (data.chapters && data.chapters.length > 0) {
        const prog = lastProgress?.scripture_id === id ? lastProgress : null
        const ch = prog ? data.chapters.find(c => c.id === prog.chapter_id) || data.chapters[0] : data.chapters[0]
        setChapter(ch)
        gsap.fromTo(contentRef.current, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.5 })
        if (prog?.scroll_position) {
          setTimeout(() => {
            if (contentRef.current)
              contentRef.current.scrollTop = contentRef.current.scrollHeight * prog.scroll_position
          }, 100)
        }
      }
    } catch (err) {
      console.error('Failed to open scripture:', err)
    }
  }

  const saveProgress = useCallback(async () => {
    if (!token || !selected || !chapter) return
    const scroll = contentRef.current
      ? contentRef.current.scrollTop / (contentRef.current.scrollHeight || 1)
      : 0
    await axios.post(`${API}/users/token/${token}/progress`, {
      scripture_id: selected.id,
      chapter_id: chapter.id,
      scroll_position: scroll
    })
  }, [token, selected, chapter])

  useEffect(() => {
    const t = setInterval(saveProgress, 15000)
    return () => clearInterval(t)
  }, [saveProgress])

  const cleanText = (t) => t
    .replace(/[*_#`~>]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[-—]{2,}/g, '')
    .replace(/,/g, '，')
    .replace(/\./g, '。')
    .replace(/\n+/g, '，')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const speak = (text) => {
    window.speechSynthesis.cancel()
    if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null }

    if (isSpeaking) {
      setIsSpeaking(false)
      return
    }

    const clean = cleanText(text).slice(0, 500)
    if (!clean) return

    const doSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(clean)
      utterance.lang = 'zh-CN'
      utterance.rate = 0.85
      utterance.pitch = 0.9

      // Use pre-loaded voices (mobile needs voiceschanged event first)
      const voices = voicesRef.current.length ? voicesRef.current : window.speechSynthesis.getVoices()
      const zhVoice = voices.find(v => v.lang.startsWith('zh'))
      if (zhVoice) utterance.voice = zhVoice

      utterance.onend = () => {
        if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null }
        setIsSpeaking(false)
      }
      utterance.onerror = () => {
        if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null }
        setIsSpeaking(false)
      }

      setIsSpeaking(true)
      window.speechSynthesis.speak(utterance)

      // Keep alive for Chrome mobile (prevents auto-pause)
      keepAliveRef.current = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(keepAliveRef.current)
          keepAliveRef.current = null
          setIsSpeaking(false)
        } else if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume()
        }
      }, 3000)
    }

    // On mobile, voices may not be loaded yet — wait briefly if empty
    if (voicesRef.current.length === 0) {
      const onVoices = () => {
        voicesRef.current = window.speechSynthesis.getVoices()
        window.speechSynthesis.removeEventListener('voiceschanged', onVoices)
        doSpeak()
      }
      window.speechSynthesis.addEventListener('voiceschanged', onVoices)
      // Fallback: if voiceschanged never fires, speak anyway after 300ms
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoices)
        if (!window.speechSynthesis.speaking) doSpeak()
      }, 300)
    } else {
      doSpeak()
    }
  }

  const getSelected = () => {
    const sel = window.getSelection()?.toString().trim()
    return sel || (chapter?.content?.slice(0, 120) || '')
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <div ref={mainRef} style={styles.layout}>

      {/* Mobile hamburger */}
      {isMobile && (
        <button style={styles.hamburger} onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? '✕' : '☰'}
        </button>
      )}

      {/* Sidebar */}
      <aside style={{
        ...styles.sidebar,
        ...(isMobile ? styles.sidebarMobile : {}),
        ...(isMobile && !sidebarOpen ? styles.sidebarHidden : {})
      }}>
        <div style={styles.sideHeader}>
          <span style={styles.sideTitle}>大藏经</span>
        </div>
        {lastProgress && (
          <div style={styles.continueHint} onClick={() => openScripture(lastProgress.scripture_id)}>
            ↩ 继续：{lastProgress.scripture_title}
          </div>
        )}
        {scriptures.map(s => (
          <div key={s.id}
            onClick={() => openScripture(s.id)}
            style={{ ...styles.sideItem, ...(selected?.id === s.id ? styles.sideItemActive : {}) }}>
            <span style={styles.sideCategory}>{s.category}</span>
            <span style={styles.sideItemTitle}>{s.title}</span>
          </div>
        ))}
      </aside>

      {/* Overlay for mobile sidebar */}
      {isMobile && sidebarOpen && (
        <div style={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <main style={styles.main}>
        {/* Top bar */}
        <div style={{ ...styles.topbar, ...(isMobile ? styles.topbarMobile : {}) }}>
          <span style={styles.topBrand}>禅境</span>
          <div style={{ ...styles.topActions, ...(isMobile ? styles.topActionsMobile : {}) }}>
            {chapter && (
              <>
                <button style={{ ...styles.iconBtn, ...(isMobile ? styles.iconBtnMobile : {}) }}
                  onClick={() => speak(chapter.content)}>
                  {isSpeaking ? '⏸' : '▶'}
                  {!isMobile && (isSpeaking ? ' 朗读中' : ' 朗读')}
                </button>
                <button style={{ ...styles.iconBtn, ...(isMobile ? styles.iconBtnMobile : {}) }}
                  onClick={() => setAiPanel({ text: getSelected(), mode: 'explain' })}>
                  ✦{!isMobile && ' 解释'}
                </button>
                <button style={{ ...styles.iconBtn, ...(isMobile ? styles.iconBtnMobile : {}) }}
                  onClick={() => setAiPanel({ text: getSelected(), mode: 'ask' })}>
                  ？{!isMobile && ' 提问'}
                </button>
              </>
            )}
          </div>
          <Timer sessionId={sessionId} onExpire={() => nav('/')} />
        </div>

        {/* Scripture content */}
        <div ref={contentRef} style={{ ...styles.content, ...(isMobile ? styles.contentMobile : {}) }}>
          {!selected && (
            <div style={styles.placeholder}>
              <div style={styles.placeholderIcon}>☸</div>
              <p style={styles.placeholderText}>
                {isMobile ? '点击左上角 ☰ 选择经文' : '请从左侧选择经文'}
              </p>
              <p style={styles.placeholderSub}>选中文字可获得 AI 解释</p>
            </div>
          )}
          {selected && chapter && (
            <>
              <h1 style={{ ...styles.scriptureTitle, ...(isMobile ? styles.scriptureTitleMobile : {}) }}>
                {selected.title}
              </h1>
              <h2 style={styles.chapterTitle}>{chapter.title}</h2>
              <div style={styles.body}>
                {chapter.content.split('\n\n').map((para, i) => (
                  <p key={i} style={{ ...styles.para, ...(isMobile ? styles.paraMobile : {}) }}
                    onTouchEnd={() => {
                      const sel = window.getSelection()?.toString().trim()
                      if (sel && sel.length > 4) setAiPanel({ text: sel, mode: 'explain' })
                    }}
                    onMouseUp={() => {
                      const sel = window.getSelection()?.toString().trim()
                      if (sel && sel.length > 4) setAiPanel({ text: sel, mode: 'explain' })
                    }}>
                    {para}
                  </p>
                ))}
              </div>
              {selected.chapters.length > 1 && (
                <div style={styles.chapterNav}>
                  {selected.chapters.map(c => (
                    <button key={c.id}
                      style={{ ...styles.chBtn, ...(c.id === chapter.id ? styles.chBtnActive : {}) }}
                      onClick={() => { setChapter(c); gsap.fromTo(contentRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 }) }}>
                      {c.title}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* AI Panel */}
      {aiPanel && (
        <AIPanel text={aiPanel.text} mode={aiPanel.mode}
          onClose={() => setAiPanel(null)} />
      )}
    </div>
  )
}

const styles = {
  layout: { display: 'flex', height: '100vh', background: '#050508', overflow: 'hidden', position: 'relative' },

  // Sidebar
  sidebar: { width: '220px', borderRight: '1px solid #c9a84c1a', overflowY: 'auto', flexShrink: 0, background: '#050508', zIndex: 50 },
  sidebarMobile: { position: 'fixed', left: 0, top: 0, bottom: 0, width: '260px', transition: 'transform 0.3s ease', boxShadow: '4px 0 20px #00000088' },
  sidebarHidden: { transform: 'translateX(-100%)' },
  sideHeader: { padding: '20px 16px 12px', borderBottom: '1px solid #c9a84c1a' },
  sideTitle: { color: '#c9a84c', fontSize: '13px', letterSpacing: '0.3em' },
  continueHint: {
    margin: '8px 10px', padding: '8px 10px',
    background: '#c9a84c0f', border: '1px solid #c9a84c33',
    borderRadius: '2px', fontSize: '11px', color: '#c9a84c',
    cursor: 'pointer', letterSpacing: '0.05em',
  },
  sideItem: {
    padding: '12px 16px', cursor: 'pointer',
    borderBottom: '1px solid #1a1808',
    display: 'flex', flexDirection: 'column', gap: '3px',
    transition: 'background 0.15s',
  },
  sideItemActive: { background: '#c9a84c0f', borderLeft: '2px solid #c9a84c' },
  sideCategory: { fontSize: '10px', color: '#5a5040', letterSpacing: '0.15em' },
  sideItemTitle: { fontSize: '14px', color: '#d4c090', letterSpacing: '0.05em' },

  // Hamburger
  hamburger: {
    position: 'fixed', top: '10px', left: '10px', zIndex: 60,
    background: '#0a0a14', border: '1px solid #c9a84c44',
    borderRadius: '4px', color: '#c9a84c', fontSize: '20px',
    width: '36px', height: '36px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  // Overlay
  overlay: {
    position: 'fixed', inset: 0, background: '#00000066', zIndex: 40,
  },

  // Main
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topbar: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px 24px', borderBottom: '1px solid #c9a84c1a',
    background: '#0a0a14',
  },
  topbarMobile: { padding: '10px 12px 10px 50px', gap: '6px' },
  topBrand: { fontSize: '13px', color: '#c9a84c', letterSpacing: '0.25em', marginRight: 'auto' },
  topActions: { display: 'flex', gap: '8px' },
  topActionsMobile: { gap: '4px' },
  iconBtn: {
    padding: '6px 14px', background: 'transparent',
    border: '1px solid #3a3020', borderRadius: '2px',
    color: '#c9a84c', fontSize: '12px', cursor: 'pointer',
    letterSpacing: '0.1em', fontFamily: "'Noto Serif SC', serif",
    transition: 'all 0.15s',
  },
  iconBtnMobile: { padding: '6px 10px', fontSize: '14px', letterSpacing: 0 },

  // Content
  content: { flex: 1, overflowY: 'auto', padding: '40px 60px', maxWidth: '780px', margin: '0 auto', width: '100%' },
  contentMobile: { padding: '20px 16px' },
  placeholder: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' },
  placeholderIcon: { fontSize: '60px', color: '#2a2818', lineHeight: 1 },
  placeholderText: { color: '#4a4030', fontSize: '16px', letterSpacing: '0.2em' },
  placeholderSub: { color: '#3a3020', fontSize: '12px', letterSpacing: '0.15em' },
  scriptureTitle: { fontSize: '28px', color: '#f0d080', fontWeight: 700, letterSpacing: '0.15em', marginBottom: '8px', textAlign: 'center' },
  scriptureTitleMobile: { fontSize: '22px' },
  chapterTitle: { fontSize: '16px', color: '#a09070', fontWeight: 400, letterSpacing: '0.2em', textAlign: 'center', marginBottom: '40px' },
  body: { lineHeight: 2.2 },
  para: { marginBottom: '28px', fontSize: '18px', color: '#d4c090', letterSpacing: '0.08em', lineHeight: 2.2, cursor: 'text' },
  paraMobile: { fontSize: '16px', lineHeight: 2.0, marginBottom: '20px' },
  chapterNav: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #1a1808' },
  chBtn: { padding: '8px 16px', background: 'transparent', border: '1px solid #2a2818', borderRadius: '2px', color: '#7a7060', fontSize: '13px', cursor: 'pointer' },
  chBtnActive: { border: '1px solid #c9a84c', color: '#c9a84c' },
}
