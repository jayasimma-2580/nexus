import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Settings, Info } from 'lucide-react'
import { adminAPI } from '../../api/client'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'

export default function AdminConfig() {
  const qc = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-config'],
    queryFn:  adminAPI.getConfig,
  })

  const [form, setForm] = useState({
    commissionRate: '', taxRate: '', shippingCost: '', freeShippingThreshold: '',
  })
  const [errors, setErrors] = useState({})

  // Populate form when config loads
  // Backend returns { success, data: config } → axios wraps in .data
  // So full path is response.data.data = config
  useEffect(() => {
    const c = data?.data?.data
    if (c) {
      setForm({
        commissionRate:        c.commissionRate        ?? '',
        taxRate:               c.taxRate               ?? '',
        shippingCost:          c.shippingCost          ?? '',
        freeShippingThreshold: c.freeShippingThreshold ?? '',
      })
    }
  }, [data])

  const update = useMutation({
    mutationFn: adminAPI.updateConfig,
    onSuccess: () => {
      toast.success('Platform config saved successfully')
      qc.invalidateQueries({ queryKey: ['admin-config'] })
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to save config'),
  })

  function validate() {
    const errs = {}
    if (form.commissionRate === '' || Number(form.commissionRate) < 0 || Number(form.commissionRate) > 100)
      errs.commissionRate = 'Must be between 0 and 100'
    if (form.taxRate === '' || Number(form.taxRate) < 0 || Number(form.taxRate) > 100)
      errs.taxRate = 'Must be between 0 and 100'
    if (form.shippingCost === '' || Number(form.shippingCost) < 0)
      errs.shippingCost = 'Must be 0 or more'
    if (form.freeShippingThreshold === '' || Number(form.freeShippingThreshold) < 0)
      errs.freeShippingThreshold = 'Must be 0 or more'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    update.mutate({
      commissionRate:        Number(form.commissionRate),
      taxRate:               Number(form.taxRate),
      shippingCost:          Number(form.shippingCost),
      freeShippingThreshold: Number(form.freeShippingThreshold),
    })
  }

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size={28} /></div>

  if (isError) return (
    <div className="text-center py-16 text-[var(--text-muted)]">
      Failed to load config. Make sure the backend is running.
    </div>
  )

  const fields = [
    {
      key:    'commissionRate',
      label:  'Platform commission rate',
      desc:   'Percentage the platform takes from each seller sale.',
      suffix: '%',
      min: 0, max: 100,
    },
    {
      key:    'taxRate',
      label:  'Tax rate',
      desc:   'Percentage added as tax on every order subtotal.',
      suffix: '%',
      min: 0, max: 100,
    },
    {
      key:    'shippingCost',
      label:  'Flat shipping cost',
      desc:   'Fixed fee when order is below the free shipping threshold.',
      suffix: '₹',
      min: 0,
    },
    {
      key:    'freeShippingThreshold',
      label:  'Free shipping threshold',
      desc:   'Orders above this subtotal get free shipping.',
      suffix: '₹',
      min: 0,
    },
  ]

  return (
    <div className="space-y-6 max-w-2xl">

      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Settings size={20} className="text-[var(--accent)]" /> Platform config
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Global settings applied to all orders.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-600 dark:text-blue-400">
          Changes apply to new orders only. Existing orders keep the rates applied at checkout.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">

        {fields.map(({ key, label, desc, suffix, min, max }) => (
          <div key={key}>
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex-1">
                <label className="font-medium text-[var(--text-primary)] text-sm block">{label}</label>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</p>
              </div>
              <div className="relative w-full sm:w-36 shrink-0">
                <input
                  type="number"
                  min={min}
                  max={max}
                  step="0.1"
                  value={form[key]}
                  onChange={e => {
                    setForm(f => ({ ...f, [key]: e.target.value }))
                    if (errors[key]) setErrors(er => ({ ...er, [key]: '' }))
                  }}
                  className={`input pr-9 text-right ${errors[key] ? 'error' : ''}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">
                  {suffix}
                </span>
              </div>
            </div>
            {errors[key] && (
              <p className="text-xs text-red-500 mt-1 text-right">{errors[key]}</p>
            )}
          </div>
        ))}

        {/* Live order preview */}
        <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] space-y-1 text-sm">
          <p className="font-medium text-[var(--text-primary)] mb-2">
            Example — ₹1,000 order
          </p>
          {(() => {
            const items = 1000
            const tax   = Number((items * (Number(form.taxRate  || 0) / 100)).toFixed(2))
            const ship  = items >= Number(form.freeShippingThreshold || 0)
              ? 0
              : Number(form.shippingCost || 0)
            const total = items + tax + ship
            const comm  = Number((items * (Number(form.commissionRate || 0) / 100)).toFixed(2))
            return (
              <>
                <div className="flex justify-between text-[var(--text-secondary)]"><span>Items</span><span>₹1,000</span></div>
                <div className="flex justify-between text-[var(--text-secondary)]"><span>Tax ({form.taxRate || 0}%)</span><span>₹{tax}</span></div>
                <div className="flex justify-between text-[var(--text-secondary)]"><span>Shipping</span><span>{ship === 0 ? 'Free' : `₹${ship}`}</span></div>
                <div className="flex justify-between font-bold text-[var(--text-primary)] border-t border-[var(--border)] pt-1 mt-1"><span>Order total</span><span>₹{total}</span></div>
                <div className="flex justify-between text-xs text-[var(--text-muted)]"><span>Platform earns ({form.commissionRate || 0}%)</span><span>₹{comm}</span></div>
                <div className="flex justify-between text-xs text-green-500"><span>Seller receives</span><span>₹{(items - comm).toFixed(2)}</span></div>
              </>
            )
          })()}
        </div>

        <div className="border-t border-[var(--border)] pt-4 flex justify-end">
          <button type="submit" disabled={update.isPending} className="btn-primary gap-2">
            {update.isPending
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Save size={15} />
            }
            Save changes
          </button>
        </div>
      </form>
    </div>
  )
}