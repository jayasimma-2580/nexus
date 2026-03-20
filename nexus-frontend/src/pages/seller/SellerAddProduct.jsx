/**
 * pages/seller/SellerAddProduct.jsx
 *
 * Add or edit a product. Sellers can also create a new category inline
 * if the category they need doesn't exist yet — no need to ask the admin.
 */
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, X, ArrowLeft, Save, Plus, Tag } from 'lucide-react'
import { productAPI, categoryAPI } from '../../api/client'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'

export default function SellerAddProduct() {
  const { id }   = useParams()
  const isEdit   = !!id
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const [form, setForm] = useState({
    name: '', description: '', price: '', category: '', stock: '',
  })
  const [images, setImages]                 = useState([])
  const [previews, setPreviews]             = useState([])
  const [existingImages, setExistingImages] = useState([])
  const [errors, setErrors]                 = useState({})

  // New category modal state
  const [catModalOpen, setCatModalOpen]   = useState(false)
  const [newCatName, setNewCatName]       = useState('')
  const [newCatDesc, setNewCatDesc]       = useState('')
  const [newCatError, setNewCatError]     = useState('')

  const clearError = (field) => {
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }))
  }

  // Fetch categories
  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn:  categoryAPI.getAll,
  })
  const categories = catData?.data?.data || []

  // Edit mode — fetch seller's own products to populate form
  const { data: myProductsData, isLoading: productLoading } = useQuery({
    queryKey: ['my-products-all'],
    queryFn:  () => productAPI.getMy({ limit: 200 }),
    enabled:  isEdit,
  })

  useEffect(() => {
    if (!isEdit || !myProductsData?.data?.data) return
    const p = myProductsData.data.data.find(prod => prod._id === id)
    if (!p) return
    setForm({
      name:        p.name        || '',
      description: p.description || '',
      price:       p.price       ?? '',
      category:    p.category?._id || '',
      stock:       p.stock       ?? '',
    })
    const urls = (p.images || []).map(img => img.url)
    setExistingImages(urls)
    setPreviews(urls)
  }, [myProductsData, id, isEdit])

  // Create new category inline
  const createCategory = useMutation({
    mutationFn: () => categoryAPI.create({ name: newCatName.trim(), description: newCatDesc.trim() }),
    onSuccess: (res) => {
      const created = res.data?.data
      toast.success(`Category "${created.name}" created`)
      qc.invalidateQueries({ queryKey: ['categories'] })
      // Auto-select the newly created category
      setForm(f => ({ ...f, category: created._id }))
      clearError('category')
      setCatModalOpen(false)
      setNewCatName('')
      setNewCatDesc('')
      setNewCatError('')
    },
    onError: (e) => {
      const msg = e.response?.data?.message || 'Failed to create category'
      if (e.response?.status === 409) {
        setNewCatError('A category with this name already exists')
      } else {
        setNewCatError(msg)
      }
    },
  })

  function handleCreateCategory() {
    if (!newCatName.trim()) { setNewCatError('Category name is required'); return }
    if (newCatName.trim().length < 2) { setNewCatError('At least 2 characters'); return }
    setNewCatError('')
    createCategory.mutate()
  }

  function validate() {
    const errs = {}
    if (!form.name.trim())        errs.name        = 'Product name is required'
    if (!form.description.trim()) errs.description = 'Description is required'
    if (form.price === '' || isNaN(Number(form.price)) || Number(form.price) <= 0)
      errs.price = 'Price must be greater than 0'
    if (!form.category)           errs.category    = 'Category is required'
    if (form.stock === '' || isNaN(Number(form.stock)) || Number(form.stock) <= 0)
      errs.stock = 'Stock must be greater than 0'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const create = useMutation({
    mutationFn: productAPI.create,
    onSuccess: () => {
      toast.success('Product submitted for review')
      qc.invalidateQueries({ queryKey: ['my-products'] })
      qc.invalidateQueries({ queryKey: ['my-products-all'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      navigate('/seller/products')
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to create product'),
  })

  const update = useMutation({
    mutationFn: ({ id, data }) => productAPI.update(id, data),
    onSuccess: () => {
      toast.success('Product updated — pending re-approval')
      qc.invalidateQueries({ queryKey: ['my-products'] })
      qc.invalidateQueries({ queryKey: ['my-products-all'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      navigate('/seller/products')
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to update product'),
  })

  function handleImages(files) {
    const arr = Array.from(files).slice(0, 5)
    setImages(arr)
    previews.filter(u => u.startsWith('blob:')).forEach(URL.revokeObjectURL)
    setPreviews([...existingImages, ...arr.map(f => URL.createObjectURL(f))])
  }

  function removePreview(idx) {
    const url = previews[idx]
    if (url.startsWith('blob:')) URL.revokeObjectURL(url)
    if (idx < existingImages.length) {
      setExistingImages(prev => prev.filter((_, i) => i !== idx))
    } else {
      const fileIdx = idx - existingImages.length
      setImages(prev => prev.filter((_, i) => i !== fileIdx))
    }
    setPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    images.forEach(img => fd.append('images', img))
    if (isEdit) existingImages.forEach(url => fd.append('keepImages', url))
    if (isEdit) update.mutate({ id, data: fd })
    else        create.mutate(fd)
  }

  const loading = create.isPending || update.isPending

  if (isEdit && productLoading) return (
    <div className="flex justify-center py-20"><Spinner size={28} /></div>
  )

  return (
    <div className="max-w-2xl space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-all">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {isEdit ? 'Edit product' : 'Add product'}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {isEdit
              ? 'Changes reset the product to pending approval'
              : 'Your product will be reviewed before going live'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">

        {/* Product name */}
        <div>
          <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">
            Product name
          </label>
          <input
            value={form.name}
            onChange={e => { setForm(f => ({ ...f, name: e.target.value })); clearError('name') }}
            placeholder="e.g. Wireless Bluetooth Headphones"
            className={`input ${errors.name ? 'error' : ''}`}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={e => { setForm(f => ({ ...f, description: e.target.value })); clearError('description') }}
            rows={4}
            placeholder="Describe your product — features, materials, dimensions…"
            className={`input resize-none ${errors.description ? 'error' : ''}`}
          />
          {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
        </div>

        {/* Price + Stock */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">
              Price (₹)
            </label>
            <input
              type="number" min="1" step="0.01"
              value={form.price}
              onChange={e => { setForm(f => ({ ...f, price: e.target.value })); clearError('price') }}
              placeholder="0.00"
              className={`input ${errors.price ? 'error' : ''}`}
            />
            {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">
              Stock quantity
            </label>
            <input
              type="number" min="1" step="1"
              value={form.stock}
              onChange={e => { setForm(f => ({ ...f, stock: e.target.value })); clearError('stock') }}
              placeholder="1"
              className={`input ${errors.stock ? 'error' : ''}`}
            />
            {errors.stock && <p className="text-xs text-red-500 mt-1">{errors.stock}</p>}
          </div>
        </div>

        {/* Category — dropdown + "Create new" button */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)]">
              Category
            </label>
            <button
              type="button"
              onClick={() => { setCatModalOpen(true); setNewCatName(''); setNewCatDesc(''); setNewCatError('') }}
              className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline font-medium"
            >
              <Plus size={12} /> Create new category
            </button>
          </div>

          {categories.length === 0 ? (
            // No categories at all — prominent empty state
            <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-5 text-center">
              <Tag size={24} className="text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-sm font-medium text-[var(--text-primary)] mb-0.5">No categories yet</p>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                Create the first category to assign to your product.
              </p>
              <button
                type="button"
                onClick={() => { setCatModalOpen(true); setNewCatName(''); setNewCatDesc(''); setNewCatError('') }}
                className="btn-primary py-2 px-4 text-sm gap-1.5"
              >
                <Plus size={14} /> Create a category
              </button>
            </div>
          ) : (
            <select
              value={form.category}
              onChange={e => { setForm(f => ({ ...f, category: e.target.value })); clearError('category') }}
              className={`input appearance-none ${errors.category ? 'error' : ''}`}
            >
              <option value="">Select a category</option>
              {categories.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          )}

          {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}

          {/* Hint when categories exist */}
          {categories.length > 0 && (
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Can't find the right category?{' '}
              <button
                type="button"
                onClick={() => { setCatModalOpen(true); setNewCatName(''); setNewCatDesc(''); setNewCatError('') }}
                className="text-[var(--accent)] hover:underline"
              >
                Create one
              </button>
            </p>
          )}
        </div>

        {/* Images */}
        <div>
          <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">
            Product images <span className="text-[var(--text-muted)]">(up to 5)</span>
          </label>
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--border)] rounded-xl p-6 cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all">
            <Upload size={24} className="text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-muted)]">Click to upload images</span>
            <span className="text-xs text-[var(--text-muted)]">PNG, JPG, WEBP · max 5MB each</span>
            <input
              type="file" accept="image/*" multiple className="hidden"
              onChange={e => handleImages(e.target.files)}
            />
          </label>
          {previews.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {previews.map((src, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden group">
                  <img src={src} className="w-full h-full object-cover" alt="" />
                  <button
                    type="button"
                    onClick={() => removePreview(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-[var(--border)]">
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost flex-1">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 gap-2">
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Save size={15} />
            }
            {isEdit ? 'Save changes' : 'Submit for review'}
          </button>
        </div>
      </form>

      {/* Create category modal */}
      <Modal
        open={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        title="Create new category"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">
            The new category will be available immediately for all sellers to use.
          </p>

          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">
              Category name <span className="text-red-500">*</span>
            </label>
            <input
              value={newCatName}
              onChange={e => { setNewCatName(e.target.value); setNewCatError('') }}
              placeholder="e.g. Electronics, Clothing, Books…"
              className={`input ${newCatError ? 'error' : ''}`}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
            />
            {newCatError && <p className="text-xs text-red-500 mt-1">{newCatError}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">
              Description <span className="text-[var(--text-muted)]">(optional)</span>
            </label>
            <input
              value={newCatDesc}
              onChange={e => setNewCatDesc(e.target.value)}
              placeholder="Brief description of what belongs in this category"
              className="input"
              onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={() => setCatModalOpen(false)} className="btn-ghost flex-1">
              Cancel
            </button>
            <button
              onClick={handleCreateCategory}
              disabled={createCategory.isPending || !newCatName.trim()}
              className="btn-primary flex-1 gap-2"
            >
              {createCategory.isPending
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Plus size={15} />
              }
              Create category
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}