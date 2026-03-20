# E-Commerce Backend — Buyer / Seller / Admin

## Roles

| Role | What they can do |
|------|-----------------|
| **buyer** | Browse products, cart, wishlist, place orders, write reviews |
| **seller** | Apply for account → get approved → list products (admin approves each) → manage own orders & earnings |
| **admin** | Approve/reject sellers & products, suspend/ban sellers, set commission rates, full analytics |

## Seller Lifecycle

```
POST /api/auth/register { role: "seller", shopName: "..." }
  → sellerStatus: "pending"
  → Admin approves via PUT /api/admin/sellers/:id/approve
  → sellerStatus: "approved"
  → Seller can now create products
  → Each product starts as status: "pending"
  → Admin approves via PUT /api/products/:id/approve
  → Product visible to buyers
```

## Commission Flow

```
Buyer places order
  → Per item: commissionRate (seller override OR platform default)
  → commissionAmount = price × qty × rate
  → sellerEarnings   = price × qty − commissionAmount
  → Stored in orderItems + sellerSubOrders
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# 3. Start development server
npm run dev

# 4. API available at http://localhost:5000
```

## API Reference

### Auth  `/api/auth`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /register | — | Register as buyer or seller |
| POST | /login | — | Login |
| POST | /logout | — | Logout |
| GET | /me | Any | Current user info |

### User  `/api/user`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /me | Any | View own profile |
| PUT | /me | Any | Update name (sellers: also shopName) |
| PUT | /change-password | Any | Change password |

### Categories  `/api/categories`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Public | List all categories |
| GET | /:id | Public | Single category |
| POST | / | Admin | Create category |
| PUT | /:id | Admin | Update category |
| DELETE | /:id | Admin | Delete category |

### Products  `/api/products`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Public | List approved products (filter/search/sort/paginate) |
| GET | /:id | Public | Single approved product |
| GET | /my | Seller | Own products (all statuses) |
| POST | / | Seller | Create product (status: pending) |
| PUT | /:id | Seller/Admin | Edit product (seller edit resets to pending) |
| DELETE | /:id | Seller/Admin | Delete product |
| GET | /pending | Admin | Products awaiting approval |
| PUT | /:id/approve | Admin | Approve product |
| PUT | /:id/reject | Admin | Reject product with reason |

### Cart  `/api/cart`  *(Buyer only)*
| Method | Path | Description |
|--------|------|-------------|
| GET | / | View cart |
| POST | / | Add item `{ productId, quantity }` |
| PUT | /item | Update quantity `{ productId, quantity }` |
| DELETE | /item/:productId | Remove item |
| DELETE | /clear | Empty cart |

### Wishlist  `/api/wishlist`  *(Buyer only)*
| Method | Path | Description |
|--------|------|-------------|
| GET | / | View wishlist |
| POST | / | Add product `{ productId }` |
| DELETE | /item/:productId | Remove product |
| DELETE | / | Clear wishlist |

### Orders  `/api/orders`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | / | Buyer | Place order (from body or cart) |
| GET | /my | Buyer | Own orders |
| GET | /seller | Seller | Sub-orders for their products |
| PUT | /:orderId/seller-status | Seller | Update fulfillment status |
| GET | /:id | Buyer/Admin | Single order |
| GET | / | Admin | All orders |
| PUT | /:id/status | Admin | Override order status |

### Reviews  `/api/reviews`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /:productId | Public | Reviews for a product |
| POST | / | Buyer | Add/update review (must have purchased) |
| DELETE | /:id | Buyer/Admin | Delete review |

### Seller Analytics  `/api/seller/analytics`  *(Approved sellers only)*
| Method | Path | Description |
|--------|------|-------------|
| GET | /overview | Earnings summary, order count, product count |
| GET | /monthly | Monthly net earnings breakdown |
| GET | /top-products | Best-selling own products |
| GET | /low-stock | Own products with low stock |

### Admin — Management  `/api/admin`  *(Admin only)*
| Method | Path | Description |
|--------|------|-------------|
| GET | /sellers?status= | List sellers by status |
| PUT | /sellers/:id/approve | Approve seller |
| PUT | /sellers/:id/reject | Reject application with reason |
| PUT | /sellers/:id/suspend | Suspend seller (hides products) |
| PUT | /sellers/:id/ban | Permanently ban seller |
| PUT | /sellers/:id/reinstate | Reinstate suspended seller |
| PUT | /sellers/:id/commission | Set custom commission rate |
| GET | /users | All platform users |
| DELETE | /users/:id | Delete user |
| GET | /config | Platform config (commission, tax, shipping) |
| PUT | /config | Update platform config |

### Admin — Analytics  `/api/admin/analytics`  *(Admin only)*
| Method | Path | Description |
|--------|------|-------------|
| GET | /overview | Buyers, sellers, products, orders, revenue, commission |
| GET | /sales/monthly | Monthly revenue + commission |
| GET | /top-sellers | Top 10 sellers by net earnings |
| GET | /top-products | Top 10 products by quantity sold |
| GET | /low-stock | Low stock products across all sellers |
| GET | /recent-orders | 10 most recent orders |

## Product Query Parameters

```
GET /api/products?q=laptop&category=<id>&minPrice=100&maxPrice=500&sort=price_asc&seller=<id>&page=1&limit=12
```

`sort` options: `price_asc` | `price_desc` | `rating` | `newest` (default)

## Response Shape

All responses follow this consistent shape:

```json
{ "success": true, "data": { ... } }
{ "success": true, "data": [...], "meta": { "total": 50, "page": 1, "pages": 5 } }
{ "success": false, "message": "Human readable error" }
```

## Free Deployment

- **Backend** → [Render](https://render.com) — free tier, connect GitHub repo
- **Frontend** → [Vercel](https://vercel.com) — free tier, auto-deploys from GitHub
- **Database** → [MongoDB Atlas](https://cloud.mongodb.com) — free M0 cluster
- **Images** → [Cloudinary](https://cloudinary.com) — free tier (replace local uploads in production)
