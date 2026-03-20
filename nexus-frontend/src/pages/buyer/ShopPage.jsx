/**
 * pages/buyer/ShopPage.jsx
 *
 * Fix Bug #5: Navbar and Footer were rendered here AND inside BuyerLayout,
 * causing them to appear twice. Removed the duplicate Navbar/Footer from this page.
 * BuyerLayout (via ProtectedRoute) handles Navbar + Footer for buyer routes.
 *
 * Public route (/shop) renders outside BuyerLayout, so we keep Navbar/Footer
 * here ONLY when the route is accessed publicly (not through BuyerLayout).
 * Since /shop is a public route in App.jsx (not nested under BuyerLayout),
 * we correctly include Navbar/Footer here.
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal, X, ChevronDown, Package } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { productAPI, categoryAPI } from '../../api/client'
import ProductCard from '../../components/ui/ProductCard'
import Pagination from '../../components/ui/Pagination'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'

export default function ShopPage() {
  // Filter state — drives the product query params
  const [filters, setFilters] = useState({
    q: '', category: '', minPrice: '', maxPrice: '', sort: 'newest',
  })
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('') // controlled separately so search only fires on submit

  // Fetch categories for the filter dropdown
  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryAPI.getAll(),
  })
  const categories = catData?.data?.data || []

  // Fetch products with current filters and page
  const queryParams = { ...filters, page, limit: 12 }
  const { data, isLoading } = useQuery({
    queryKey: ['products', queryParams],
    queryFn: () => productAPI.getAll(queryParams),
    keepPreviousData: true, // keeps old results visible while new page loads
  })
  const products = data?.data?.data || []
  const meta = data?.data?.meta || {}

  // Apply search only when user clicks Search or presses Enter
  function applySearch() {
    setFilters(f => ({ ...f, q: searchInput }))
    setPage(1)
  }

  // Update a single filter and reset to page 1
  function setFilter(key, val) {
    setFilters(f => ({ ...f, [key]: val }))
    setPage(1)
  }

  // Reset everything
  function clearFilters() {
    setFilters({ q: '', category: '', minPrice: '', maxPrice: '', sort: 'newest' })
    setSearchInput('')
    setPage(1)
  }

  // Count active filters to show on the filter button badge
  const activeFilterCount = [filters.category, filters.minPrice, filters.maxPrice]
    .filter(Boolean).length

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar — ShopPage is a PUBLIC route, not inside BuyerLayout */}
      <Navbar />

      <div className="flex-1 page-container py-8">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
          <div>
            <h1 className="section-heading text-3xl">Shop</h1>
            {meta.total != null && (
              <p className="text-sm text-[var(--text-muted)] mt-0.5">
                {meta.total} product{meta.total !== 1 ? 's' : ''} found
              </p>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={filters.sort}
              onChange={e => setFilter('sort', e.target.value)}
              className="input pr-9 appearance-none text-sm py-2 min-w-36"
            >
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
              <option value="rating">Best rated</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          </div>
        </div>

        {/* Search bar */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applySearch()}
              placeholder="Search products…"
              className="input pl-9 pr-4"
            />
          </div>
          <button onClick={applySearch} className="btn-primary px-5">Search</button>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`btn-ghost px-4 gap-2 relative ${filtersOpen ? 'border-[var(--accent)] text-[var(--accent)]' : ''}`}
          >
            <SlidersHorizontal size={15} />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold flex items-center justify-center absolute -top-1 -right-1">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Collapsible filter panel */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-2">Category</label>
                  <select
                    value={filters.category}
                    onChange={e => setFilter('category', e.target.value)}
                    className="input text-sm py-2 appearance-none"
                  >
                    <option value="">All categories</option>
                    {categories.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-2">Min price</label>
                  <input
                    type="number" min="0"
                    value={filters.minPrice}
                    onChange={e => setFilter('minPrice', e.target.value)}
                    placeholder="₹0"
                    className="input text-sm py-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-2">Max price</label>
                  <input
                    type="number" min="0"
                    value={filters.maxPrice}
                    onChange={e => setFilter('maxPrice', e.target.value)}
                    placeholder="Any"
                    className="input text-sm py-2"
                  />
                </div>
                <div className="flex items-end">
                  <button onClick={clearFilters} className="btn-ghost w-full gap-2 text-sm py-2">
                    <X size={14} /> Clear all
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active search chip */}
        {filters.q && (
          <div className="flex gap-2 flex-wrap mb-4">
            <span className="flex items-center gap-1.5 badge badge-purple">
              &quot;{filters.q}&quot;
              <button onClick={() => { setFilter('q', ''); setSearchInput('') }}>
                <X size={10} />
              </button>
            </span>
          </div>
        )}

        {/* Products grid */}
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size={32} /></div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products found"
            description="Try adjusting your search or filters."
            action={<button onClick={clearFilters} className="btn-secondary">Clear filters</button>}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p, i) => (
              <ProductCard key={p._id} product={p} delay={i * 0.02} />
            ))}
          </div>
        )}

        <Pagination
          page={meta.page || 1}
          pages={meta.pages || 1}
          onPageChange={setPage}
        />
      </div>

      <Footer />
    </div>
  )
}
