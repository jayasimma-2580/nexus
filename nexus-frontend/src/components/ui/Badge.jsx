const variants = {
  purple:  'badge-purple',
  green:   'badge-green',
  yellow:  'badge-yellow',
  red:     'badge-red',
  blue:    'badge-blue',
  gray:    'badge-gray',
}

const statusMap = {
  approved:   'green',
  pending:    'yellow',
  rejected:   'red',
  suspended:  'yellow',
  banned:     'red',
  delivered:  'green',
  shipped:    'blue',
  processing: 'purple',
  cancelled:  'red',
  none:       'gray',
}

export default function Badge({ children, variant, status, className = '' }) {
  const v = variant || statusMap[status] || 'gray'
  return (
    <span className={`badge ${variants[v] || 'badge-gray'} ${className}`}>
      {children}
    </span>
  )
}
