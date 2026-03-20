# NEXUS Market — Frontend

React 18 + Vite frontend for the NEXUS platform.

## Tech Stack
- **React 18** + **Vite**
- **TailwindCSS** — utility-first styling with CSS variables for dark/light mode
- **Framer Motion** — page & component animations
- **TanStack Query** — server state, caching, mutations
- **Zustand** — auth, cart, theme stores (persisted)
- **Recharts** — admin and seller analytics charts
- **React Hot Toast** — global toast notifications
- **Axios** — HTTP client with token injection + error interceptors

## Features
- **Auth**: Register (buyer/seller), Login, Email verification, Forgot/Reset password
- **Dark/Light mode**: Persistent, system-aware
- **Buyer**: Shop (search, filter, sort, paginate), Product detail, Cart, Wishlist, Checkout, Orders
- **Seller**: Dashboard with charts, Product CRUD (with image upload), Order fulfillment, Profile/password
- **Admin**: Dashboard overview, Seller management, Product approvals, Order management, User management, Platform config
- **Error pages**: 404, 401 Unauthorized, 500 Server Error, Seller Pending/Suspended/Banned

## Setup

```bash
cd nexus-frontend
npm install
cp .env.example .env        # Set VITE_API_URL if needed
npm run dev
```

Runs on `http://localhost:5173`. Proxies `/api` and `/uploads` to `http://localhost:5000`.

## Build for production
```bash
npm run build
npm run preview
```

## Folder structure
```
src/
  api/          # Axios client + typed API modules
  components/
    layout/     # Navbar, BuyerLayout, SellerLayout, AdminLayout, Footer
    ui/         # Badge, Modal, Input, Select, ProductCard, StatCard, Pagination…
    shared/     # ProtectedRoute
  pages/
    auth/       # AuthPage (login+register), VerifyEmail, ForgotPassword, ResetPassword
    buyer/      # ShopPage, ProductDetail, CartPage, WishlistPage, CheckoutPage, OrdersPage, OrderDetail
    seller/     # SellerDashboard, SellerProducts, SellerAddProduct, SellerOrders, SellerProfile
    admin/      # AdminDashboard, AdminSellers, AdminProducts, AdminOrders, AdminUsers, AdminConfig
    error/      # NotFound, Unauthorized, ServerError, SellerPending
  store/        # authStore (useAuthStore, useCartStore, useThemeStore)
```
