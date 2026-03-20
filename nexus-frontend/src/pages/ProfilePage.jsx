/**
 * ProfilePage.jsx
 * Full profile management for all roles.
 * - Name, phone (with OTP verify button), address for all users
 * - Shop name, description, business address for sellers
 * - Change password with old/new/confirm
 */
import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Save, User, Shield, Phone, MapPin, CheckCircle, RefreshCw } from 'lucide-react'
import { userAPI, authAPI } from '../api/client'
import { useAuthStore } from '../store/authStore'
import Badge from '../components/ui/Badge'
import toast from 'react-hot-toast'

// ── Phone OTP mini-widget (inline, no separate page) ─────────────────────────
function PhoneVerifyWidget({ user, onVerified }) {
  const [step, setStep]           = useState('idle') // idle | sent | verify
  const [otp, setOtp]             = useState('')
  const [loading, setLoading]     = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  async function sendOtp() {
    setLoading(true)
    try {
      await authAPI.sendPhoneOtp()
      toast.success('OTP sent to your email!')
      setStep('verify')
      setCountdown(60)
      setOtp('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP')
    } finally { setLoading(false) }
  }

  async function verifyOtp() {
    if (otp.length < 6) return toast.error('Enter the 6-digit OTP')
    setLoading(true)
    try {
      const res = await authAPI.verifyPhoneOtp(otp)
      onVerified(res.data.data)
      toast.success('Phone verified!')
      setStep('idle')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP')
      setOtp('')
    } finally { setLoading(false) }
  }

  if (user?.isPhoneVerified) {
    return (
      <div className="flex items-center gap-2 mt-1">
        <CheckCircle size={14} className="text-green-500 shrink-0" />
        <span className="text-xs text-green-600 dark:text-green-400 font-medium">Phone verified</span>
      </div>
    )
  }

  if (!user?.phone) return null

  return (
    <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Phone number not verified yet</p>
      {step === 'idle' && (
        <button onClick={sendOtp} disabled={loading} className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline font-medium">
          {loading ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : <Phone size={12} />}
          Send verification OTP to my email
        </button>
      )}
      {step === 'verify' && (
        <div className="space-y-2">
          <input
            value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
            placeholder="Enter 6-digit OTP"
            className="input text-sm py-1.5 w-full font-mono tracking-widest"
            maxLength={6}
          />
          <div className="flex gap-2">
            <button onClick={verifyOtp} disabled={loading || otp.length < 6} className="btn-primary py-1.5 px-3 text-xs flex-1">
              {loading ? <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" /> : 'Verify'}
            </button>
            {countdown > 0
              ? <span className="text-xs text-[var(--text-muted)] self-center">Resend in {countdown}s</span>
              : <button onClick={sendOtp} disabled={loading} className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline">
                  <RefreshCw size={11} /> Resend
                </button>
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ── Address form ──────────────────────────────────────────────────────────────
function AddressFields({ value, onChange, label }) {
  const set = (k, v) => onChange({ ...value, [k]: v })
  return (
    <div className="space-y-3">
      {label && <p className="text-sm font-medium text-[var(--text-secondary)]">{label}</p>}
      <input value={value.street || ''} onChange={e => set('street', e.target.value)}
        placeholder="Street address" className="input" />
      <div className="grid grid-cols-2 gap-3">
        <input value={value.city || ''} onChange={e => set('city', e.target.value)}
          placeholder="City" className="input" />
        <input value={value.state || ''} onChange={e => set('state', e.target.value)}
          placeholder="State / Province" className="input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input value={value.postalCode || ''} onChange={e => set('postalCode', e.target.value)}
          placeholder="Postal code" className="input" />
        <input value={value.country || ''} onChange={e => set('country', e.target.value)}
          placeholder="Country" className="input" />
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, updateUser, setAuth } = useAuthStore()

  const emptyAddress = { street: '', city: '', state: '', postalCode: '', country: '' }

  const [form, setForm] = useState({
    name: '', phone: '', address: { ...emptyAddress },
    shopName: '', shopDescription: '', shopAddress: { ...emptyAddress },
  })
  const [pwForm, setPwForm]   = useState({ oldPassword: '', newPassword: '', confirmNewPassword: '' })
  const [pwError, setPwError] = useState('')

  useEffect(() => {
    if (user) {
      setForm({
        name:            user.name            || '',
        phone:           user.phone           || '',
        address:         user.address         || { ...emptyAddress },
        shopName:        user.shopName        || '',
        shopDescription: user.shopDescription || '',
        shopAddress:     user.shopAddress     || { ...emptyAddress },
      })
    }
  }, [user?.name, user?.phone, user?.shopName])

  const updateProfile = useMutation({
    mutationFn: () => userAPI.updateProfile({
      name:            form.name.trim(),
      phone:           form.phone.trim() || undefined,
      address:         form.address,
      shopName:        form.shopName.trim(),
      shopDescription: form.shopDescription.trim(),
      shopAddress:     form.shopAddress,
    }),
    onSuccess: res => { updateUser(res.data.data); toast.success('Profile updated') },
    onError:   e  => toast.error(e.response?.data?.message || 'Failed to update'),
  })

  const changePw = useMutation({
    mutationFn: () => userAPI.changePassword({ oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword }),
    onSuccess: () => {
      toast.success('Password changed successfully')
      setPwForm({ oldPassword: '', newPassword: '', confirmNewPassword: '' })
      setPwError('')
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to change password'),
  })

  function handleChangePassword() {
    if (!pwForm.oldPassword)                                return setPwError('Current password is required')
    if (pwForm.newPassword.length < 6)                      return setPwError('New password must be at least 6 characters')
    if (pwForm.newPassword === pwForm.oldPassword)          return setPwError('New password must be different from the current one')
    if (pwForm.newPassword !== pwForm.confirmNewPassword)   return setPwError('Passwords do not match')
    setPwError('')
    changePw.mutate()
  }

  function handlePhoneVerified(userData) {
    updateUser(userData)
    if (userData.token) setAuth(userData, userData.token)
  }

  return (
    <div className="page-container py-10">
      <h1 className="section-heading text-3xl mb-8">Profile & Settings</h1>

      <div className="max-w-2xl space-y-6">

        {/* Identity card */}
        <div className="card p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{user?.name}</h2>
            <p className="text-sm text-[var(--text-muted)]">{user?.email}</p>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              <Badge variant={user?.role === 'admin' ? 'purple' : user?.role === 'seller' ? 'blue' : 'green'}>
                {user?.role}
              </Badge>
              <Badge variant={user?.isEmailVerified ? 'green' : 'yellow'}>
                {user?.isEmailVerified ? '✓ Email verified' : 'Email unverified'}
              </Badge>
              {user?.phone && (
                <Badge variant={user?.isPhoneVerified ? 'green' : 'yellow'}>
                  {user?.isPhoneVerified ? '✓ Phone verified' : 'Phone unverified'}
                </Badge>
              )}
              {user?.role === 'seller' && (
                <Badge status={user?.sellerStatus}>{user?.sellerStatus}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Profile info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <User size={16} className="text-[var(--accent)]" /> Profile information
          </h2>

          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Full name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Your full name" className="input" />
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">
              Phone number
            </label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+91 98765 43210" className="input pl-9" type="tel" />
            </div>
            <PhoneVerifyWidget user={user} onVerified={handlePhoneVerified} />
          </div>

          {/* Seller-only shop fields */}
          {user?.role === 'seller' && (
            <>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Shop name</label>
                <input value={form.shopName} onChange={e => setForm(f => ({ ...f, shopName: e.target.value }))}
                  placeholder="Your store name" className="input" />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Shop description</label>
                <textarea value={form.shopDescription} onChange={e => setForm(f => ({ ...f, shopDescription: e.target.value }))}
                  rows={3} placeholder="Tell buyers about your store…" className="input resize-none" />
              </div>
            </>
          )}

          <div className="flex justify-end pt-2">
            <button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending || !form.name.trim()} className="btn-primary gap-2">
              {updateProfile.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
              Save profile
            </button>
          </div>
        </div>

        {/* Address */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <MapPin size={16} className="text-[var(--accent)]" /> Address
          </h2>
          <AddressFields
            value={form.address}
            onChange={addr => setForm(f => ({ ...f, address: addr }))}
            label="Delivery address"
          />
          {user?.role === 'seller' && (
            <>
              <div className="border-t border-[var(--border)] pt-4">
                <AddressFields
                  value={form.shopAddress}
                  onChange={addr => setForm(f => ({ ...f, shopAddress: addr }))}
                  label="Business / shop address"
                />
              </div>
            </>
          )}
          <div className="flex justify-end pt-2">
            <button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} className="btn-primary gap-2">
              {updateProfile.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
              Save address
            </button>
          </div>
        </div>

        {/* Change password */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Shield size={16} className="text-[var(--accent)]" /> Change password
          </h2>

          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Current password</label>
            <input type="password" value={pwForm.oldPassword} onChange={e => setPwForm(f => ({ ...f, oldPassword: e.target.value }))}
              placeholder="Your current password" className="input" autoComplete="current-password" />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">New password</label>
            <input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
              placeholder="Min. 6 characters" className="input" autoComplete="new-password" />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Confirm new password</label>
            <input type="password" value={pwForm.confirmNewPassword} onChange={e => setPwForm(f => ({ ...f, confirmNewPassword: e.target.value }))}
              placeholder="Re-enter new password" className="input" autoComplete="new-password" />
          </div>

          {pwError && <p className="text-xs text-red-500">{pwError}</p>}

          <div className="flex justify-end">
            <button onClick={handleChangePassword} disabled={changePw.isPending || !pwForm.oldPassword || !pwForm.newPassword}
              className="btn-primary gap-2">
              {changePw.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
              Update password
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
