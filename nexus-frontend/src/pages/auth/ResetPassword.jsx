/**
 * ResetPassword.jsx
 * Password reset is now fully handled in ForgotPassword.jsx (3-step OTP flow).
 * This page exists only as a redirect for any old bookmarked URLs.
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ResetPassword() {
  const navigate = useNavigate()
  useEffect(() => { navigate('/forgot-password', { replace: true }) }, [navigate])
  return null
}
