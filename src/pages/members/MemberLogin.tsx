// src/pages/members/Login.tsx
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { db, auth } from '../../lib/firebase'
import toast from 'react-hot-toast'

interface MemberSession {
  badgeNumber: number | string
  customerId: string
  email: string
  fullName: string
}

const MemberLogin: React.FC = () => {
  const [badgeNumber, setBadgeNumber] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!badgeNumber.trim() || !password) {
      toast.error('Please enter both badge number and password')
      return
    }

    const raw = badgeNumber.trim()
    const badgeNum = parseInt(raw, 10)

    try {
      // 1) Lookup member by badge
      let snap = await getDocs(
        query(collection(db, 'customers'), where('badgeNumber', '==', badgeNum))
      )
      if (snap.empty) {
        snap = await getDocs(
          query(collection(db, 'customers'), where('badgeNumber', '==', raw))
        )
      }
      if (snap.empty) {
        // we treat "not found" same as wrong credentials
        throw new Error('auth/invalid-credentials')
      }

      const docSnap = snap.docs[0]
      const data = docSnap.data() as any

      if (data.status !== 'ACTIVE') {
        toast.error('Member is not active. Please contact the admin.')
        return
      }

      const email = data.email as string
      const fullName = data.fullName as string
      const customerId = docSnap.id

      // 2) Sign in
      await signInWithEmailAndPassword(auth, email, password)

      // 3) Save session
      const session: MemberSession = { badgeNumber: raw, customerId, email, fullName }
      localStorage.setItem('memberSession', JSON.stringify(session))

      toast.success('Login successful')
      navigate('/members/dashboard')
    } catch (err: any) {
      console.error('Login error:', err)
      // unified message for any sign-in or lookup failure
      toast.error('Badge number or password is incorrect. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg space-y-6">
        <h2 className="text-2xl font-bold text-center">Member Login</h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="Badge Number"
            value={badgeNumber}
            onChange={e => setBadgeNumber(e.target.value)}
            className="w-full border px-4 py-2 rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border px-4 py-2 rounded"
          />
          <button
            type="submit"
            className="w-full bg-primary text-white py-2 rounded hover:bg-primary-600"
          >
            Login
          </button>
        </form>

        <p className="text-sm text-center text-gray-500">
          Not registered?{' '}
          <Link to="/members/register" className="text-primary hover:underline">
            Register here
          </Link>
        </p>

        {/* Back to Admin login */}
        <p className="text-sm text-center">
          <Link to="/login" className="text-gray-600 hover:text-gray-800 hover:underline">
            ← Back to Admin Login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default MemberLogin
