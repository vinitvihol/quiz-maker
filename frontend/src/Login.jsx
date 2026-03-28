import { useState } from 'react'
import { auth, provider, db } from './firebase'
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const saveUser = async (user, displayName) => {
    const ref = doc(db, 'users', user.uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, {
        name: displayName || user.displayName || 'Anonymous',
        email: user.email || '',
        createdAt: new Date(),
        totalQuizzes: 0,
        bestScore: 0
      })
    }
    onLogin(user)
  }

  const handleGoogle = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await signInWithPopup(auth, provider)
      await saveUser(result.user)
    } catch (err) {
      setError('Google sign in failed. Try again.')
    }
    setLoading(false)
  }

  const handleEmail = async () => {
    if (!email || !password) return setError('Please fill in all fields')
    if (isSignUp && !name) return setError('Please enter your name')
    setLoading(true)
    setError('')
    try {
      let result
      if (isSignUp) {
        result = await createUserWithEmailAndPassword(auth, email, password)
        await saveUser(result.user, name)
      } else {
        result = await signInWithEmailAndPassword(auth, email, password)
        await saveUser(result.user)
      }
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('Email already in use. Try logging in.')
      else if (err.code === 'auth/wrong-password') setError('Wrong password.')
      else if (err.code === 'auth/user-not-found') setError('No account found. Sign up first.')
      else if (err.code === 'auth/weak-password') setError('Password must be at least 6 characters.')
      else setError('Something went wrong. Try again.')
    }
    setLoading(false)
  }

  const handleGuest = async () => {
    setLoading(true)
    try {
      const result = await signInAnonymously(auth)
      await saveUser(result.user, 'Guest')
    } catch (err) {
      setError('Guest login failed.')
    }
    setLoading(false)
  }

  return (
    <div style={s.container}>
      <div style={s.card}>
        <h1 style={s.title}>AI Quiz Maker</h1>
        <p style={s.sub}>Sign in to save your scores and compete!</p>

        <button style={s.googleBtn} onClick={handleGoogle} disabled={loading}>
          <img src="https://www.google.com/favicon.ico" width="18" height="18" style={{marginRight:'10px'}}/>
          Continue with Google
        </button>

        <div style={s.divider}><span style={s.dividerText}>or</span></div>

        {isSignUp && (
          <input style={s.input} placeholder="Your name" value={name} onChange={e => setName(e.target.value)}/>
        )}
        <input style={s.input} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)}/>
        <input style={s.input} placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)}/>

        {error && <p style={s.error}>{error}</p>}

        <button style={s.btn} onClick={handleEmail} disabled={loading}>
          {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
        </button>

        <p style={s.toggle}>
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <span style={s.link} onClick={() => { setIsSignUp(!isSignUp); setError('') }}>
            {isSignUp ? 'Sign in' : 'Sign up'}
          </span>
        </p>

        <button style={s.guestBtn} onClick={handleGuest} disabled={loading}>
          Continue as Guest
        </button>
      </div>
    </div>
  )
}

const s = {
  container: { minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  card: { background: '#1e1e2e', borderRadius: '16px', padding: '40px', maxWidth: '420px', width: '100%' },
  title: { color: '#fff', fontSize: '28px', fontWeight: '700', textAlign: 'center', marginBottom: '8px' },
  sub: { color: '#888', textAlign: 'center', marginBottom: '28px', fontSize: '14px' },
  googleBtn: { width: '100%', background: '#fff', color: '#111', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' },
  divider: { display: 'flex', alignItems: 'center', margin: '4px 0 16px', gap: '12px' },
  dividerText: { color: '#555', fontSize: '13px', whiteSpace: 'nowrap' },
  input: { width: '100%', background: '#13131f', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '12px', fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box' },
  error: { color: '#ef4444', fontSize: '13px', marginBottom: '12px', textAlign: 'center' },
  btn: { width: '100%', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', padding: '13px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginBottom: '16px' },
  toggle: { color: '#888', fontSize: '13px', textAlign: 'center', marginBottom: '16px' },
  link: { color: '#7c3aed', cursor: 'pointer', fontWeight: '500' },
  guestBtn: { width: '100%', background: 'transparent', color: '#888', border: '1px solid #333', borderRadius: '8px', padding: '12px', fontSize: '14px', cursor: 'pointer' },
}