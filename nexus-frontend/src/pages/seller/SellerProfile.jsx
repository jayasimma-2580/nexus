/**
 * pages/seller/SellerProfile.jsx
 *
 * Fix Bug #6: This was a near-duplicate of ProfilePage.jsx.
 * Removed the duplicate and rendered ProfilePage directly inside the seller layout.
 * ProfilePage already handles seller-specific fields (shopName, shopDescription)
 * and detects when it's rendered inside a sidebar (no extra Navbar/Footer).
 */

import ProfilePage from '../ProfilePage'

// Simply re-use ProfilePage — it auto-detects seller role and hides Navbar/Footer
export default function SellerProfile() {
  return <ProfilePage />
}
