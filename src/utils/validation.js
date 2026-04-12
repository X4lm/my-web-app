export function validatePassword(password) {
  if (password.length < 12) return 'Password must be at least 12 characters'
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter'
  if (!/\d/.test(password)) return 'Password must contain at least one digit'
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/.test(password)) return 'Password must contain at least one special character'
  return null
}

export function validateAmount(value) {
  const num = Number(value)
  if (isNaN(num) || num <= 0) return 'Enter a valid positive amount'
  if (num > 99999999.99) return 'Amount exceeds maximum allowed (99,999,999.99)'
  if (value && !/^\d+(\.\d{1,2})?$/.test(String(value))) return 'Maximum 2 decimal places allowed'
  return null
}

export function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)
}

export function validateFile(file, { maxSizeMB = 10, allowedTypes = null } = {}) {
  const MAX_SIZE = maxSizeMB * 1024 * 1024
  const DEFAULT_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]
  if (file.size > MAX_SIZE) throw new Error(`File exceeds ${maxSizeMB}MB limit`)
  const types = allowedTypes || DEFAULT_TYPES
  if (!types.includes(file.type)) throw new Error(`File type "${file.type}" is not allowed`)
  return sanitizeFilename(file.name)
}

export function validateEmiratesId(id) {
  if (!id) return null
  const pattern = /^\d{3}-\d{4}-\d{7}-\d{1}$/
  if (!pattern.test(id)) return 'Invalid Emirates ID format (784-YYYY-NNNNNNN-C)'
  return null
}
