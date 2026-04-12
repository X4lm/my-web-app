import { useState, useRef } from 'react'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import app from '@/firebase/config'
import { logError } from '@/utils/logger'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Upload, X, Loader2 } from 'lucide-react'
import { validateFile } from '@/utils/validation'

export default function ImageUpload({ value, onChange, folder, label }) {
  const { currentUser } = useAuth()
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef()

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const safeName = validateFile(file, {
        maxSizeMB: 5,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      })
      const storage = getStorage(app)
      const storageRef = ref(storage, `${currentUser.uid}/${folder}/${Date.now()}_${safeName}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      onChange(url)
    } catch (err) {
      if (err.message.includes('File') || err.message.includes('limit') || err.message.includes('type')) { alert(err.message) }
      logError('[Storage] Upload error:', err)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleRemove() {
    onChange('')
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {value ? (
        <div className="relative group rounded-md overflow-hidden border border-input">
          <img src={value} alt={label} className="w-full h-32 object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center justify-center gap-2 w-full h-24 rounded-md border border-dashed border-input bg-muted/30 text-sm text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer disabled:opacity-50"
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
          ) : (
            <><Upload className="h-4 w-4" /> Click to upload</>
          )}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  )
}
