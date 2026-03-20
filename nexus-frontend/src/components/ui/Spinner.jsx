export default function Spinner({ size = 20, className = '' }) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-transparent border-t-[var(--accent)] ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
