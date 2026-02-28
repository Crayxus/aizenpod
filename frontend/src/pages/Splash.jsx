import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'

/* ── 莲花花瓣路径（8瓣） ── */
const PETAL_COUNT = 8
function petalPath(i, r1 = 60, r2 = 130) {
  const a = (i / PETAL_COUNT) * Math.PI * 2 - Math.PI / 2
  const a1 = a - Math.PI / PETAL_COUNT
  const a2 = a + Math.PI / PETAL_COUNT
  const cx = Math.cos(a) * r2, cy = Math.sin(a) * r2
  const x1 = Math.cos(a1) * r1, y1 = Math.sin(a1) * r1
  const x2 = Math.cos(a2) * r1, y2 = Math.sin(a2) * r1
  return `M 0 0 Q ${x1} ${y1} ${cx} ${cy} Q ${x2} ${y2} 0 0 Z`
}

/* ── 神经网络节点 ── */
const NODES = Array.from({ length: 28 }, (_, i) => ({
  x: Math.cos((i / 28) * Math.PI * 2) * (200 + Math.sin(i * 1.7) * 80),
  y: Math.sin((i / 28) * Math.PI * 2) * (200 + Math.cos(i * 1.3) * 80),
  r: 2 + Math.random() * 3
}))

const EDGES = NODES.flatMap((n, i) =>
  NODES.slice(i + 1)
    .filter((_, j) => Math.random() < 0.18)
    .map(m => ({ x1: n.x, y1: n.y, x2: m.x, y2: m.y }))
)

export default function Splash() {
  const nav = useNavigate()
  const svgRef = useRef()
  const containerRef = useRef()
  const textRef = useRef()
  const subRef = useRef()
  const btnRef = useRef()
  const podRef = useRef()

  useEffect(() => {
    const tl = gsap.timeline()
    const ctx = gsap.context(() => {

      /* 1. 背景粒子射线 */
      gsap.set('.ray', { opacity: 0, scaleX: 0, transformOrigin: 'left center' })
      tl.to('.ray', { opacity: 0.12, scaleX: 1, duration: 1.8, stagger: 0.06, ease: 'power2.out' }, 0)

      /* 2. 神经网络线条依次亮起 */
      gsap.set('.net-edge', { opacity: 0 })
      tl.to('.net-edge', { opacity: 0.25, duration: 0.6, stagger: 0.02, ease: 'none' }, 0.3)

      /* 3. 节点脉冲出现 */
      gsap.set('.net-node', { scale: 0, opacity: 0, transformOrigin: 'center center' })
      tl.to('.net-node', { scale: 1, opacity: 0.7, duration: 0.4, stagger: 0.03, ease: 'back.out(2)' }, 0.8)

      /* 4. 莲花花瓣展开 */
      gsap.set('.petal', { scale: 0, opacity: 0, transformOrigin: 'center center' })
      tl.to('.petal', {
        scale: 1, opacity: 0.85, duration: 0.7, stagger: 0.08,
        ease: 'elastic.out(1, 0.6)'
      }, 1.2)

      /* 5. 莲花核心辉光 */
      gsap.set('.lotus-core', { scale: 0, opacity: 0 })
      tl.to('.lotus-core', { scale: 1, opacity: 1, duration: 0.8, ease: 'power3.out' }, 1.8)

      /* 6. 静音舱剪影淡入 */
      gsap.set(podRef.current, { opacity: 0, y: 30 })
      tl.to(podRef.current, { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' }, 1.5)

      /* 7. 主标题逐字揭示 */
      gsap.set(textRef.current, { opacity: 0, y: 40, filter: 'blur(12px)' })
      tl.to(textRef.current, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, ease: 'power3.out' }, 2.2)

      /* 8. 副标题 */
      gsap.set(subRef.current, { opacity: 0, letterSpacing: '0.6em' })
      tl.to(subRef.current, { opacity: 1, letterSpacing: '0.25em', duration: 1.2, ease: 'power2.out' }, 2.8)

      /* 9. 按钮浮现 */
      gsap.set(btnRef.current, { opacity: 0, scale: 0.8 })
      tl.to(btnRef.current, { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.4)' }, 3.4)

      /* 10. 节点持续脉冲 */
      gsap.to('.net-node', {
        opacity: 0.3, scale: 1.3, duration: 1.5,
        yoyo: true, repeat: -1, stagger: { each: 0.1, from: 'random' },
        ease: 'sine.inOut'
      })

      /* 11. 莲花缓慢旋转 */
      gsap.to('.lotus-group', {
        rotation: 360, duration: 40, repeat: -1, ease: 'none',
        transformOrigin: 'center center'
      })

      /* 12. 核心辉光呼吸 */
      gsap.to('.lotus-core', {
        scale: 1.15, opacity: 0.85, duration: 2.5,
        yoyo: true, repeat: -1, ease: 'sine.inOut'
      })

    }, containerRef)

    return () => ctx.revert()
  }, [])

  const enter = () => {
    gsap.to(containerRef.current, {
      opacity: 0, scale: 1.05, duration: 0.8, ease: 'power2.in',
      onComplete: () => nav('/welcome')
    })
  }

  return (
    <div ref={containerRef} style={styles.container}>

      {/* 放射光线背景 */}
      <div style={styles.rays}>
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="ray" style={{
            ...styles.ray,
            transform: `rotate(${i * 20}deg)`,
            background: `linear-gradient(90deg, transparent, ${i % 3 === 0 ? '#c9a84c' : i % 3 === 1 ? '#7b4cc8' : '#ffffff'}22, transparent)`
          }} />
        ))}
      </div>

      {/* 中央 SVG — 神经网络 + 莲花 */}
      <svg ref={svgRef} style={styles.svg} viewBox="-320 -320 640 640">
        <defs>
          <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f0d080" stopOpacity="1" />
            <stop offset="60%" stopColor="#c9a84c" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#7a6030" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="purpleGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#b080ff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#4a2080" stopOpacity="0" />
          </radialGradient>
          <filter id="blur4">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* 神经网络边 */}
        {EDGES.map((e, i) => (
          <line key={i} className="net-edge"
            x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke="#c9a84c" strokeWidth="0.5" />
        ))}

        {/* 神经网络节点 */}
        {NODES.map((n, i) => (
          <circle key={i} className="net-node"
            cx={n.x} cy={n.y} r={n.r}
            fill={i % 3 === 0 ? '#c9a84c' : '#b080ff'}
            filter="url(#glow)" />
        ))}

        {/* 外圈装饰环 */}
        <circle cx="0" cy="0" r="165" fill="none" stroke="#c9a84c" strokeWidth="0.5" strokeDasharray="4 8" opacity="0.3" />
        <circle cx="0" cy="0" r="145" fill="none" stroke="#7b4cc8" strokeWidth="0.3" strokeDasharray="2 12" opacity="0.2" />

        {/* 莲花组 */}
        <g className="lotus-group">
          {/* 外层花瓣 */}
          {Array.from({ length: PETAL_COUNT }).map((_, i) => (
            <path key={i} className="petal"
              d={petalPath(i, 55, 120)}
              fill="url(#goldGlow)" opacity="0.7"
              filter="url(#glow)" />
          ))}
          {/* 内层花瓣 */}
          {Array.from({ length: PETAL_COUNT }).map((_, i) => (
            <path key={i + 100} className="petal"
              d={petalPath(i + 0.5, 30, 70)}
              fill="url(#purpleGlow)" opacity="0.6" />
          ))}
        </g>

        {/* 莲花核心辉光 */}
        <circle className="lotus-core" cx="0" cy="0" r="38"
          fill="url(#goldGlow)" filter="url(#blur4)" />
        <circle className="lotus-core" cx="0" cy="0" r="18"
          fill="#f0d080" opacity="0.9" filter="url(#glow)" />
      </svg>

      {/* 静音舱剪影 */}
      <div ref={podRef} style={styles.podWrap}>
        <svg viewBox="0 0 200 300" style={styles.podSvg}>
          <defs>
            <linearGradient id="podGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#c9a84c" stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="podGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f0d080" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#c9a84c" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {/* 舱体 */}
          <rect x="30" y="40" width="140" height="240" rx="30" fill="url(#podGrad)" stroke="#c9a84c" strokeWidth="1" strokeOpacity="0.4" />
          {/* 内部发光 */}
          <rect x="45" y="55" width="110" height="180" rx="20" fill="url(#podGlow)" opacity="0.3" />
          {/* 屏幕 */}
          <rect x="55" y="70" width="90" height="60" rx="6" fill="#c9a84c" fillOpacity="0.15" stroke="#c9a84c" strokeWidth="0.8" strokeOpacity="0.5" />
          {/* 屏幕发光线条 */}
          {[85, 95, 105, 115].map(y => (
            <line key={y} x1="62" y1={y} x2="138" y2={y} stroke="#c9a84c" strokeWidth="0.5" strokeOpacity="0.4" />
          ))}
          {/* 沙发 */}
          <rect x="50" y="175" width="100" height="50" rx="12" fill="#c9a84c" fillOpacity="0.12" stroke="#c9a84c" strokeWidth="0.8" strokeOpacity="0.3" />
          <rect x="50" y="195" width="100" height="35" rx="10" fill="#c9a84c" fillOpacity="0.08" />
          {/* 底部 */}
          <rect x="70" y="275" width="60" height="8" rx="4" fill="#c9a84c" fillOpacity="0.3" />
        </svg>
      </div>

      {/* 品牌文字 */}
      <div style={styles.brand}>
        <div ref={textRef} style={styles.title}>
          <span style={styles.titleZh}>禅境</span>
          <span style={styles.titleEn}>ZenPod</span>
        </div>
        <div ref={subRef} style={styles.tagline}>
          以 AI 之光 · 悟经文之道
        </div>
      </div>

      {/* 进入按钮 */}
      <button ref={btnRef} onClick={enter} style={styles.btn}
        onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.06, duration: 0.2 })}
        onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, duration: 0.2 })}>
        <span style={styles.btnText}>入定 · Enter</span>
        <span style={styles.btnGlow} />
      </button>

      {/* 底部装饰文字 */}
      <div style={styles.footer}>
        OM MANI PADME HUM · 唵 嘛 呢 叭 咪 吽
      </div>
    </div>
  )
}

const styles = {
  container: {
    position: 'fixed', inset: 0,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at 50% 40%, #0f0a1e 0%, #050508 70%)',
    overflow: 'hidden',
  },
  rays: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'none',
  },
  ray: {
    position: 'absolute',
    width: '100vmax', height: '2px',
    transformOrigin: 'left center',
    left: '50%', top: '50%',
  },
  svg: {
    position: 'absolute',
    width: 'min(80vw, 80vh)', height: 'min(80vw, 80vh)',
    pointerEvents: 'none',
  },
  podWrap: {
    position: 'absolute',
    bottom: '8vh', right: '8vw',
    opacity: 0.6,
  },
  podSvg: {
    width: 'min(100px, 8vw)', height: 'auto',
  },
  brand: {
    position: 'relative', zIndex: 10,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '12px',
    marginTop: 'min(60vw, 60vh)',
  },
  title: {
    display: 'flex', alignItems: 'baseline', gap: '20px',
  },
  titleZh: {
    fontSize: 'clamp(48px, 8vw, 96px)',
    fontFamily: "'Noto Serif SC', serif",
    fontWeight: 700,
    color: '#f0d080',
    textShadow: '0 0 40px #c9a84c88, 0 0 80px #c9a84c44',
    letterSpacing: '0.1em',
  },
  titleEn: {
    fontSize: 'clamp(20px, 3.5vw, 40px)',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 300,
    color: '#c9a84c',
    letterSpacing: '0.35em',
    textTransform: 'uppercase',
  },
  tagline: {
    fontSize: 'clamp(12px, 1.6vw, 18px)',
    color: '#a09070',
    letterSpacing: '0.25em',
    fontFamily: "'Noto Serif SC', serif",
  },
  btn: {
    position: 'relative',
    marginTop: '32px',
    padding: '14px 48px',
    background: 'transparent',
    border: '1px solid #c9a84c',
    borderRadius: '2px',
    cursor: 'pointer',
    overflow: 'hidden',
    zIndex: 10,
  },
  btnText: {
    position: 'relative', zIndex: 1,
    fontSize: 'clamp(13px, 1.5vw, 16px)',
    color: '#f0d080',
    letterSpacing: '0.3em',
    fontFamily: "'Noto Serif SC', serif",
  },
  btnGlow: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(90deg, transparent, #c9a84c18, transparent)',
    animation: 'shimmer 2.5s infinite',
  },
  footer: {
    position: 'absolute', bottom: '3vh',
    fontSize: 'clamp(9px, 1vw, 11px)',
    color: '#4a4030',
    letterSpacing: '0.3em',
    fontFamily: "'Inter', sans-serif",
  },
}
