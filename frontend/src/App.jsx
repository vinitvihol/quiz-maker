import { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import * as pdfjsLib from 'pdfjs-dist'
import { auth, db } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore'
import Login from './Login'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

const COLORS = {
  bg: '#0a0a14',
  card: 'rgba(255,255,255,0.05)',
  cardBorder: 'rgba(255,255,255,0.1)',
  purple: '#7c3aed',
  purpleLight: '#a855f7',
  purpleGlow: 'rgba(124,58,237,0.3)',
  text: '#ffffff',
  subtext: 'rgba(255,255,255,0.5)',
  input: 'rgba(255,255,255,0.07)',
  inputBorder: 'rgba(255,255,255,0.1)',
  green: '#22c55e',
  red: '#ef4444',
}

const glass = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '20px',
}

const TOPICS = [
  { emoji: '🎬', label: 'Movies' },
  { emoji: '📚', label: 'Books' },
  { emoji: '🎵', label: 'Music' },
  { emoji: '⚽', label: 'Sports' },
  { emoji: '🔬', label: 'Science' },
  { emoji: '🌍', label: 'Geography' },
  { emoji: '🏛️', label: 'History' },
  { emoji: '💻', label: 'Technology' },
  { emoji: '🎮', label: 'Video Games' },
  { emoji: '🍕', label: 'Food' },
  { emoji: '🐾', label: 'Animals' },
  { emoji: '🎭', label: 'TV Shows' },
  { emoji: '🚀', label: 'Space' },
  { emoji: '🎨', label: 'Art' },
  { emoji: '🧠', label: 'General Knowledge' },
  { emoji: '🃏', label: 'Anime' },
]

function Particles() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      o: Math.random() * 0.5 + 0.1,
    }))
    let frame
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(168,85,247,${p.o})`
        ctx.fill()
        p.x += p.dx; p.y += p.dy
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1
      })
      frame = requestAnimationFrame(draw)
    }
    draw()
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: 0, pointerEvents: 'none' }} />
}

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [page, setPage] = useState('quiz')
  const [history, setHistory] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [inputMode, setInputMode] = useState('topic')
  const [text, setText] = useState('')
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [customTopic, setCustomTopic] = useState('')
  const [numQuestions, setNumQuestions] = useState(5)
  const [difficulty, setDifficulty] = useState('medium')
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(false)
  const [currentQ, setCurrentQ] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [answers, setAnswers] = useState([])
  const [timeLeft, setTimeLeft] = useState(30)
  const [displayScore, setDisplayScore] = useState(0)
  const [pageAnim, setPageAnim] = useState(true)
  const [pdfLoading, setPdfLoading] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setAuthLoading(false) })
    return unsub
  }, [])

  useEffect(() => {
    setPageAnim(false)
    setTimeout(() => setPageAnim(true), 50)
  }, [page, quiz, showResult])

  useEffect(() => {
    if (!quiz || selected || showResult) return
    setTimeLeft(30)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); autoSubmit(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [currentQ, quiz])

  useEffect(() => {
    if (!showResult) return
    setDisplayScore(0)
    let c = 0
    const iv = setInterval(() => { c++; setDisplayScore(c); if (c >= score) clearInterval(iv) }, 120)
    return () => clearInterval(iv)
  }, [showResult])

  const autoSubmit = () => {
    if (selected) return
    setSelected('timeout')
    setAnswers(a => [...a, {
      question: quiz.questions[currentQ].question,
      selected: '⏱ Time ran out',
      correct: quiz.questions[currentQ].answer,
      isCorrect: false,
      explanation: quiz.questions[currentQ].explanation
    }])
  }

  const fireConfetti = () => {
    confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 }, colors: ['#7c3aed', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6'] })
    setTimeout(() => confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0 } }), 300)
    setTimeout(() => confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 1 } }), 600)
  }

  const saveResult = async (finalScore, total, topicName) => {
    if (!user || user.isAnonymous) return
    const pct = Math.min(100, Math.round((finalScore / total) * 100))
    try {
      await addDoc(collection(db, 'quizResults'), {
        uid: user.uid,
        name: user.displayName || user.email || 'Anonymous',
        score: finalScore, total, percentage: pct,
        date: new Date(),
        topic: topicName || text.substring(0, 60) + '...'
      })
    } catch (err) { console.error(err) }
  }

  const loadHistory = async () => {
    if (!user) return
    try {
      const q = query(collection(db, 'quizResults'), where('uid', '==', user.uid), orderBy('date', 'desc'))
      const snap = await getDocs(q)
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) { console.error(err) }
  }

  const loadLeaderboard = async () => {
    try {
      const q = query(collection(db, 'quizResults'), orderBy('percentage', 'desc'))
      const snap = await getDocs(q)
      setLeaderboard(snap.docs.slice(0, 10).map(d => ({ id: d.id, ...d.data() })))
    } catch (err) { console.error(err) }
  }

  const handlePDF = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPdfLoading(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      let fullText = ''
      for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        fullText += content.items.map(item => item.str).join(' ') + '\n'
      }
      setText(fullText.trim())
    } catch (err) {
      alert('Failed to read PDF. Make sure it is not a scanned image PDF.')
    }
    setPdfLoading(false)
  }

  const generateQuiz = async () => {
    setLoading(true)
    try {
      let res, topicName

      if (inputMode === 'topic') {
        const topic = customTopic.trim() || selectedTopic?.label
        if (!topic) { alert('Please select or type a topic!'); setLoading(false); return }
        topicName = topic
        res = await fetch('https://quiz-maker-production-7dc9.up.railway.app/api/generate-quiz-topic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, numQuestions, difficulty })
        })
      } else {
        if (!text.trim()) { alert('Please paste some text or upload a PDF!'); setLoading(false); return }
        topicName = text.substring(0, 50) + '...'
        res = await fetch('https://quiz-maker-production-7dc9.up.railway.app/api/generate-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, numQuestions, difficulty })
        })
      }

      const data = await res.json()
      if (data.error) { alert('Error: ' + data.error); setLoading(false); return }
      setQuiz({ ...data, topicName })
      setCurrentQ(0); setScore(0); setAnswers([]); setShowResult(false); setSelected(null)
    } catch { alert('Failed to connect to backend!') }
    setLoading(false)
  }

  const handleAnswer = (option) => {
    if (selected) return
    clearInterval(timerRef.current)
    setSelected(option)
    const correct = option === quiz.questions[currentQ].answer
    if (correct) setScore(s => s + 1)
    setAnswers(a => [...a, {
      question: quiz.questions[currentQ].question,
      selected: option, correct: quiz.questions[currentQ].answer,
      isCorrect: correct, explanation: quiz.questions[currentQ].explanation
    }])
  }

  const nextQuestion = async () => {
    const isLast = currentQ + 1 >= quiz.questions.length
    if (isLast) {
      const finalScore = Math.min(quiz.questions.length, answers.filter(a => a.isCorrect).length + (selected === quiz.questions[currentQ].answer ? 1 : 0))
      setShowResult(true)
      await saveResult(finalScore, quiz.questions.length, quiz.topicName)
      if (finalScore === quiz.questions.length) setTimeout(fireConfetti, 600)
    } else {
      setCurrentQ(q => q + 1); setSelected(null)
    }
  }

  const reset = () => {
    setQuiz(null); setText(''); setSelected(null); setScore(0)
    setAnswers([]); setShowResult(false); clearInterval(timerRef.current)
    setPage('quiz'); setSelectedTopic(null); setCustomTopic('')
  }

  const timerColor = timeLeft > 15 ? COLORS.green : timeLeft > 7 ? '#f59e0b' : COLORS.red
  const animStyle = { opacity: pageAnim ? 1 : 0, transform: pageAnim ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 0.35s ease, transform 0.35s ease' }

  const navbar = (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(10,10,20,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px' }}>
      <p style={{ color: COLORS.purpleLight, fontWeight: '800', fontSize: '18px', letterSpacing: '-0.5px' }}>✦ AI Quiz Maker</p>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {['quiz', 'history', 'leaderboard'].map(p => (
          (!user?.isAnonymous || p !== 'history') && (
            <button key={p} onClick={() => { setPage(p); if (p === 'history') loadHistory(); if (p === 'leaderboard') loadLeaderboard() }}
              style={{ background: page === p ? 'rgba(124,58,237,0.2)' : 'transparent', border: page === p ? '1px solid rgba(124,58,237,0.4)' : '1px solid transparent', color: page === p ? COLORS.purpleLight : COLORS.subtext, borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', textTransform: 'capitalize', transition: 'all 0.2s' }}>
              {p === 'quiz' ? '🚀 Quiz' : p === 'history' ? '📋 History' : '🏆 Leaderboard'}
            </button>
          )
        ))}
        <button onClick={() => signOut(auth)} style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px', marginLeft: '8px' }}>
          Sign out
        </button>
      </div>
    </div>
  )

  const wrap = (content) => (
    <div style={{ minHeight: '100vh', background: COLORS.bg, paddingTop: '80px', paddingBottom: '40px', position: 'relative' }}>
      <Particles />
      <div style={{ position: 'absolute', top: '10%', left: '20%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 1 }} />
      {navbar}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'center', padding: '0 20px' }}>
        <div style={{ maxWidth: '680px', width: '100%', ...animStyle }}>{content}</div>
      </div>
    </div>
  )

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', border: `3px solid ${COLORS.purpleLight}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: COLORS.subtext }}>Loading...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!user) return <Login onLogin={u => setUser(u)} />

  if (page === 'history') return wrap(
    <div style={{ ...glass, padding: '32px' }}>
      <h2 style={{ color: COLORS.text, fontSize: '24px', fontWeight: '700', marginBottom: '24px' }}>📋 Your Quiz History</h2>
      {history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ fontSize: '48px', marginBottom: '12px' }}>📭</p>
          <p style={{ color: COLORS.subtext }}>No quizzes yet! Take one to see your history.</p>
        </div>
      ) : history.map((h, i) => (
        <div key={i} style={{ background: COLORS.input, border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px 20px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
          <div>
            <p style={{ color: COLORS.text, fontSize: '14px', fontWeight: '500' }}>{h.topic}</p>
            <p style={{ color: COLORS.subtext, fontSize: '12px', marginTop: '4px' }}>{new Date(h.date?.toDate?.() || h.date).toLocaleDateString()}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: h.percentage >= 80 ? COLORS.green : h.percentage >= 50 ? '#f59e0b' : COLORS.red, fontSize: '22px', fontWeight: '700' }}>{h.percentage}%</p>
            <p style={{ color: COLORS.subtext, fontSize: '12px' }}>{h.score}/{h.total}</p>
          </div>
        </div>
      ))}
    </div>
  )

  if (page === 'leaderboard') return wrap(
    <div style={{ ...glass, padding: '32px' }}>
      <h2 style={{ color: COLORS.text, fontSize: '24px', fontWeight: '700', marginBottom: '24px' }}>🏆 Leaderboard</h2>
      {leaderboard.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ fontSize: '48px', marginBottom: '12px' }}>🏅</p>
          <p style={{ color: COLORS.subtext }}>No scores yet! Be the first!</p>
        </div>
      ) : leaderboard.map((l, i) => (
        <div key={i} style={{ background: COLORS.input, border: `1px solid ${i === 0 ? 'rgba(245,158,11,0.4)' : i === 1 ? 'rgba(156,163,175,0.4)' : i === 2 ? 'rgba(180,83,9,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '12px', padding: '16px 20px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '24px' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
            <div>
              <p style={{ color: COLORS.text, fontSize: '14px', fontWeight: '600' }}>{l.name}</p>
              <p style={{ color: COLORS.subtext, fontSize: '12px', marginTop: '2px' }}>{l.topic}</p>
            </div>
          </div>
          <p style={{ color: l.percentage >= 80 ? COLORS.green : '#f59e0b', fontSize: '22px', fontWeight: '700' }}>{l.percentage}%</p>
        </div>
      ))}
    </div>
  )

  if (showResult) return wrap(
    <div style={{ ...glass, padding: '40px' }}>
      <h1 style={{ color: COLORS.text, fontSize: '28px', fontWeight: '800', textAlign: 'center', marginBottom: '8px' }}>
        {score === quiz.questions.length ? '🎉 Perfect Score!' : 'Quiz Complete!'}
      </h1>
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <div style={{ fontSize: '88px', fontWeight: '800', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>{displayScore}</div>
        <div style={{ color: COLORS.subtext, marginTop: '8px', fontSize: '18px' }}>out of {quiz.questions.length}</div>
        <div style={{ marginTop: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', height: '10px', overflow: 'hidden' }}>
          <div style={{ height: '10px', borderRadius: '100px', background: score === quiz.questions.length ? 'linear-gradient(90deg, #22c55e, #86efac)' : 'linear-gradient(90deg, #7c3aed, #a855f7)', width: `${(displayScore / quiz.questions.length) * 100}%`, transition: 'width 0.12s ease' }} />
        </div>
        <p style={{ color: COLORS.subtext, marginTop: '12px', fontSize: '14px' }}>
          {score === quiz.questions.length ? '🔥 Flawless!' : score >= quiz.questions.length * 0.7 ? '💪 Great job!' : score >= quiz.questions.length * 0.4 ? '📚 Keep practising!' : '🎯 Keep studying!'}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '24px 0' }}>
        {answers.map((a, i) => (
          <div key={i} style={{ background: COLORS.input, borderRadius: '12px', padding: '16px', borderLeft: `4px solid ${a.isCorrect ? COLORS.green : COLORS.red}` }}>
            <p style={{ color: COLORS.text, fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>{a.question}</p>
            <p style={{ color: a.isCorrect ? COLORS.green : COLORS.red, fontSize: '13px' }}>Your answer: {a.selected}</p>
            {!a.isCorrect && <p style={{ color: COLORS.green, fontSize: '13px' }}>Correct: {a.correct}</p>}
            <p style={{ color: COLORS.subtext, fontSize: '12px', marginTop: '6px' }}>{a.explanation}</p>
          </div>
        ))}
      </div>
      <button onClick={reset} style={btnStyle}>Make Another Quiz</button>
    </div>
  )

  if (quiz) return wrap(
    <div style={{ ...glass, padding: '40px' }}>
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '100px', height: '6px', marginBottom: '24px' }}>
        <div style={{ background: 'linear-gradient(90deg, #7c3aed, #a855f7)', height: '6px', borderRadius: '100px', width: `${((currentQ + 1) / quiz.questions.length) * 100}%`, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <span style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', color: COLORS.purpleLight, borderRadius: '100px', padding: '4px 14px', fontSize: '13px', fontWeight: '500' }}>
          Question {currentQ + 1} / {quiz.questions.length}
        </span>
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: `3px solid ${timerColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: timerColor, transition: 'color 0.3s, border-color 0.3s', boxShadow: `0 0 12px ${timerColor}40` }}>
          {timeLeft}
        </div>
      </div>
      <h2 style={{ color: COLORS.text, fontSize: '20px', fontWeight: '600', marginBottom: '24px', lineHeight: '1.5' }}>{quiz.questions[currentQ].question}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {quiz.questions[currentQ].options.map((option, i) => {
          let bg = COLORS.input, border = 'rgba(255,255,255,0.08)', glow = 'none'
          if (selected) {
            if (option === quiz.questions[currentQ].answer) { bg = 'rgba(34,197,94,0.15)'; border = COLORS.green; glow = '0 0 16px rgba(34,197,94,0.2)' }
            else if (option === selected) { bg = 'rgba(239,68,68,0.15)'; border = COLORS.red; glow = '0 0 16px rgba(239,68,68,0.2)' }
          }
          return (
            <button key={i} onClick={() => handleAnswer(option)}
              style={{ background: bg, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px 20px', color: COLORS.text, cursor: 'pointer', textAlign: 'left', fontSize: '15px', transition: 'all 0.2s', boxShadow: glow }}
              onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)' }}
              onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}>
              {option}
            </button>
          )
        })}
      </div>
      {selected && (
        <div style={{ marginTop: '20px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '12px', padding: '16px' }}>
          <p style={{ color: COLORS.subtext, fontSize: '14px', marginBottom: '14px' }}>{quiz.questions[currentQ].explanation}</p>
          <button onClick={nextQuestion} style={btnStyle}>
            {currentQ + 1 >= quiz.questions.length ? '🏁 See Results' : 'Next Question →'}
          </button>
        </div>
      )}
    </div>
  )

  return wrap(
    <div style={{ ...glass, padding: '40px' }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'inline-block', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '100px', padding: '6px 16px', marginBottom: '16px' }}>
          <span style={{ color: COLORS.purpleLight, fontSize: '13px', fontWeight: '500' }}>
            {user.isAnonymous ? '👤 Guest Mode' : `👋 ${user.displayName || user.email}`}
          </span>
        </div>
        <h1 style={{ color: COLORS.text, fontSize: '36px', fontWeight: '800', letterSpacing: '-1px', marginBottom: '8px' }}>
          AI <span style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Quiz</span> Maker
        </h1>
        <p style={{ color: COLORS.subtext, fontSize: '15px' }}>Pick a topic or paste your own text</p>
      </div>

      {/* Mode switcher */}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', marginBottom: '24px' }}>
        {[{ id: 'topic', label: '🎯 Pick a Topic' }, { id: 'text', label: '📝 Paste Text / PDF' }].map(m => (
          <button key={m.id} onClick={() => setInputMode(m.id)}
            style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s', background: inputMode === m.id ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'transparent', color: inputMode === m.id ? '#fff' : COLORS.subtext }}>
            {m.label}
          </button>
        ))}
      </div>

      {inputMode === 'topic' ? (
        <div>
          <p style={{ color: COLORS.subtext, fontSize: '13px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Choose a topic</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
            {TOPICS.map(t => (
              <button key={t.label} onClick={() => { setSelectedTopic(t); setCustomTopic('') }}
                style={{ background: selectedTopic?.label === t.label ? 'rgba(124,58,237,0.3)' : COLORS.input, border: `1px solid ${selectedTopic?.label === t.label ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '12px', padding: '12px 8px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
                onMouseEnter={e => { if (selectedTopic?.label !== t.label) e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)' }}
                onMouseLeave={e => { if (selectedTopic?.label !== t.label) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '22px', marginBottom: '4px' }}>{t.emoji}</div>
                <div style={{ color: COLORS.text, fontSize: '11px', fontWeight: '500' }}>{t.label}</div>
              </button>
            ))}
          </div>
          <p style={{ color: COLORS.subtext, fontSize: '13px', marginBottom: '8px' }}>Or type your own topic</p>
          <input
            value={customTopic}
            onChange={e => { setCustomTopic(e.target.value); setSelectedTopic(null) }}
            placeholder="e.g. Harry Potter, World War 2, Taylor Swift..."
            style={{ width: '100%', background: COLORS.input, border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: COLORS.text, padding: '12px 16px', fontSize: '14px', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }}
            onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.5)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
          />
          {(selectedTopic || customTopic) && (
            <div style={{ marginTop: '12px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '10px', padding: '10px 14px' }}>
              <p style={{ color: COLORS.purpleLight, fontSize: '13px' }}>
                ✓ Generating quiz about: <strong>{customTopic || selectedTopic?.label}</strong>
              </p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div
            onClick={() => document.getElementById('pdf-upload').click()}
            style={{ border: '2px dashed rgba(124,58,237,0.4)', borderRadius: '12px', padding: '20px', textAlign: 'center', marginBottom: '16px', cursor: 'pointer', background: 'rgba(124,58,237,0.05)', transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.8)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'}>
            <input id="pdf-upload" type="file" accept=".pdf" style={{ display: 'none' }} onChange={handlePDF} />
            <p style={{ color: COLORS.purpleLight, fontSize: '14px', fontWeight: '500' }}>
              {pdfLoading ? '📄 Reading PDF...' : '📎 Click to upload a PDF'}
            </p>
            <p style={{ color: COLORS.subtext, fontSize: '12px', marginTop: '4px' }}>or paste text below</p>
          </div>
          <textarea
            style={{ width: '100%', background: COLORS.input, border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: COLORS.text, padding: '16px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', outline: 'none', lineHeight: '1.6', transition: 'border-color 0.2s' }}
            placeholder="Paste your text here..."
            value={text}
            onChange={e => setText(e.target.value)}
            rows={6}
            onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.5)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
          />
          {text && <p style={{ color: COLORS.green, fontSize: '12px', marginTop: '6px' }}>✓ {text.length} characters ready</p>}
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', margin: '20px 0' }}>
        {[
          { label: 'Questions', val: numQuestions, opts: [3, 5, 10], set: v => setNumQuestions(Number(v)) },
          { label: 'Difficulty', val: difficulty, opts: ['easy', 'medium', 'hard'], set: v => setDifficulty(v) }
        ].map(({ label, val, opts, set }) => (
          <div key={label} style={{ flex: 1 }}>
            <label style={{ color: COLORS.subtext, fontSize: '12px', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
            <select value={val} onChange={e => set(e.target.value)}
              style={{ width: '100%', background: COLORS.input, border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: COLORS.text, padding: '11px 14px', fontSize: '14px', outline: 'none', cursor: 'pointer' }}>
              {opts.map(o => <option key={o} value={o} style={{ background: '#1a1a2e' }}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      <button onClick={generateQuiz} disabled={loading}
        style={{ ...btnStyle, opacity: loading ? 0.7 : 1 }}
        onMouseEnter={e => { if (!loading) e.target.style.transform = 'translateY(-2px)' }}
        onMouseLeave={e => e.target.style.transform = 'translateY(0)'}>
        {loading ? '✨ Generating your quiz...' : '🚀 Generate Quiz'}
      </button>
    </div>
  )
}

const btnStyle = {
  width: '100%', background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
  color: '#fff', border: 'none', borderRadius: '12px', padding: '14px',
  fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginTop: '8px',
  transition: 'opacity 0.2s, transform 0.2s',
  boxShadow: '0 4px 24px rgba(124,58,237,0.4)',
}

export default App
