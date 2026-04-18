import { useState, useRef } from 'react'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import app from '@/firebase/config'
import { logError } from '@/utils/logger'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Upload, X, Loader2, FileText, ExternalLink } from 'lucide-react'
import { validateFile } from '@/utils/validation'

export default function DocumentUpload({ value, onChange, folder, label }) {
  const { currentUser } = useAuth()
  const { t } = useLocale()
  const toast = useToast()
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef()

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const safeName = validateFile(file, { maxSizeMB: 10 })
      const storage = getStorage(app)
      const storageRef = ref(storage, `${currentUser.uid}/documents/${folder}/${Date.now()}_${safeName}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      onChange(url)
    } catch (err) {
      if (err.message.includes('File') || err.message.includes('limit') || err.message.includes('type')) {
        toast.error(err.message)
      } else {
        toast.error(t('common.uploadFailed'))
      }
      logError('[Storage] Document upload error:', err)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleRemove() {
    onChange('')
  }

  const uploadText = label ? t('docs.uploadLabel', { label }) : t('docs.uploadDocument')
  const viewText = label ? t('docs.viewLabel', { label }) : t('docs.viewDocument')

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      {value ? (
        <div className="flex items-center gap-2 p-2 rounded-md border border-input">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline truncate flex-1"
            onClick={e => e.stopPropagation()}
          >
            {viewText} <ExternalLink className="inline h-3 w-3 ml-1" />
          </a>
          <button
            type="button"
            onClick={handleRemove}
            className="h-6 w-6 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center cursor-pointer"
            aria-label={t('common.delete')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center justify-center gap-2 w-full h-16 rounded-md border border-dashed border-input bg-muted/30 text-sm text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer disabled:opacity-50"
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> {t('docs.uploading')}</>
          ) : (
            <><Upload className="h-4 w-4" /> {uploadText}</>
          )}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFile} className="hidden" />
    </div>
  )
}
