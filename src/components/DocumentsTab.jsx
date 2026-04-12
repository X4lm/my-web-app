import { useState, useEffect, useRef } from 'react'
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import app, { db } from '@/firebase/config'
import { logError } from '@/utils/logger'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  FileText, Plus, MoreHorizontal, Trash2, ExternalLink,
  Upload, Loader2, Search, FolderOpen,
} from 'lucide-react'

const DOC_CATEGORY_KEYS = [
  { value: 'title_deed', tKey: 'docs.catTitleDeed' },
  { value: 'lease_agreement', tKey: 'docs.catLease' },
  { value: 'ejari', tKey: 'docs.catEjari' },
  { value: 'insurance', tKey: 'docs.catInsurance' },
  { value: 'municipality_permit', tKey: 'docs.catMunicipality' },
  { value: 'noc', tKey: 'docs.catNoc' },
  { value: 'dewa', tKey: 'docs.catDewa' },
  { value: 'chiller', tKey: 'docs.catChiller' },
  { value: 'tenant_id', tKey: 'docs.catTenantId' },
  { value: 'tenant_visa', tKey: 'docs.catTenantVisa' },
  { value: 'trade_license', tKey: 'docs.catTradeLicense' },
  { value: 'salary_certificate', tKey: 'docs.catSalaryCert' },
  { value: 'maintenance_invoice', tKey: 'docs.catMaintenanceInvoice' },
  { value: 'inspection_report', tKey: 'docs.catInspectionReport' },
  { value: 'receipt', tKey: 'docs.catReceipt' },
  { value: 'other', tKey: 'docs.catOther' },
]

export default function DocumentsTab({ propertyId }) {
  const { currentUser } = useAuth()
  const { t, formatDateTime } = useLocale()

  const DOC_CATEGORIES = DOC_CATEGORY_KEYS.map(c => ({ value: c.value, label: t(c.tKey) }))
  const CATEGORY_LABELS = Object.fromEntries(DOC_CATEGORIES.map(c => [c.value, c.label]))

  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const fileRef = useRef()

  const [form, setForm] = useState({
    name: '', category: 'other', expiryDate: '', notes: '', unitNumber: '',
  })

  const colPath = `users/${currentUser.uid}/properties/${propertyId}/documents`

  useEffect(() => {
    const q = query(collection(db, colPath), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, (err) => {
      logError('[Firestore] Documents listen error:', err)
      setLoading(false)
    })
    return unsub
  }, [colPath])

  function openAdd() {
    setForm({ name: '', category: 'other', expiryDate: '', notes: '', unitNumber: '' })
    setDialogOpen(true)
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file || !form.name.trim()) return
    setUploading(true)
    try {
      const storage = getStorage(app)
      const storagePath = `${currentUser.uid}/properties/${propertyId}/documents/${Date.now()}_${file.name}`
      const storageRef = ref(storage, storagePath)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)

      await addDoc(collection(db, colPath), {
        name: form.name,
        category: form.category,
        expiryDate: form.expiryDate || null,
        notes: form.notes,
        unitNumber: form.unitNumber,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        url,
        storagePath,
        createdAt: serverTimestamp(),
        uploadedBy: currentUser.displayName || currentUser.email || 'Unknown',
      })
      setDialogOpen(false)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      logError('[Documents] Upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(docItem) {
    if (!window.confirm(`${t('common.delete')} "${docItem.name}"?`)) return
    try {
      await deleteDoc(doc(db, colPath, docItem.id))
      if (docItem.storagePath) {
        try {
          const storage = getStorage(app)
          await deleteObject(ref(storage, docItem.storagePath))
        } catch { /* storage delete may fail if already removed */ }
      }
    } catch (err) {
      logError('[Documents] Delete error:', err)
    }
  }

  function formatFileSize(bytes) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  // Check for expired documents
  const now = new Date()
  const expiredDocs = documents.filter(d => d.expiryDate && new Date(d.expiryDate) < now)
  const soonExpiring = documents.filter(d => {
    if (!d.expiryDate) return false
    const exp = new Date(d.expiryDate)
    const diff = exp.getTime() - now.getTime()
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000
  })

  const filtered = documents.filter(d => {
    if (filterCategory !== 'all' && d.category !== filterCategory) return false
    if (!search) return true
    const s = search.toLowerCase()
    return (d.name || '').toLowerCase().includes(s) ||
      (d.fileName || '').toLowerCase().includes(s) ||
      (d.unitNumber || '').toLowerCase().includes(s)
  })

  return (
    <div className="space-y-4">
      {/* Expiry alerts */}
      {(expiredDocs.length > 0 || soonExpiring.length > 0) && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-3">
            <div className="flex flex-wrap gap-4 text-sm">
              {expiredDocs.length > 0 && (
                <span className="text-destructive font-medium">
                  {expiredDocs.length} {t('docs.expired')}
                </span>
              )}
              {soonExpiring.length > 0 && (
                <span className="text-amber-600 font-medium">
                  {soonExpiring.length} {t('docs.expiringSoon')}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="w-4 h-4" /> {t('docs.title')} ({documents.length})
            </CardTitle>
            <Button onClick={openAdd} size="sm">
              <Plus className="w-4 h-4" /> {t('docs.upload')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and filter */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('docs.search')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
            >
              <option value="all">{t('docs.allTypes')}</option>
              {DOC_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t('common.loading')}</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-medium">
                {documents.length === 0 ? t('docs.noDocuments') : t('docs.noMatches')}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('docs.uploadDesc')}
              </p>
              {documents.length === 0 && (
                <Button onClick={openAdd} size="sm" className="mt-4">
                  <Plus className="w-4 h-4" /> {t('docs.uploadDocument')}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(docItem => {
                const isExpired = docItem.expiryDate && new Date(docItem.expiryDate) < now
                const isSoon = docItem.expiryDate && !isExpired && (new Date(docItem.expiryDate).getTime() - now.getTime()) < 30 * 24 * 60 * 60 * 1000
                return (
                  <div
                    key={docItem.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${isExpired ? 'border-destructive/50 bg-destructive/5' : isSoon ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/10' : ''}`}
                  >
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{docItem.name}</p>
                        <Badge variant="secondary" className="text-[10px]">
                          {CATEGORY_LABELS[docItem.category] || docItem.category}
                        </Badge>
                        {docItem.unitNumber && (
                          <Badge variant="outline" className="text-[10px]">{t('common.unit')} {docItem.unitNumber}</Badge>
                        )}
                        {isExpired && <Badge variant="destructive" className="text-[10px]">{t('docs.expired')}</Badge>}
                        {isSoon && <Badge variant="warning" className="text-[10px]">{t('docs.expiringSoon')}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {docItem.fileName} {docItem.fileSize ? `(${formatFileSize(docItem.fileSize)})` : ''}
                        {docItem.expiryDate ? ` · ${t('docs.expires')}: ${docItem.expiryDate}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={docItem.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <a href={docItem.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-2 h-3.5 w-3.5" /> {t('docs.open')}
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(docItem)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!uploading) setDialogOpen(open) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('docs.uploadDocument')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('docs.documentName')} *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={t('docs.namePlaceholder')}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('docs.category')}</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  {DOC_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t('docs.unitOptional')}</Label>
                <Input
                  value={form.unitNumber}
                  onChange={e => setForm(f => ({ ...f, unitNumber: e.target.value }))}
                  placeholder={t('docs.unitPlaceholder')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('docs.expiryDate')}</Label>
              <Input
                type="date"
                value={form.expiryDate}
                onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('docs.notesOptional')}</Label>
              <Input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder={t('docs.notesPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('docs.file')} *</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={uploading}>{t('common.cancel')}</Button>
            <Button onClick={handleUpload} disabled={uploading || !form.name.trim()}>
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.upload')}...</> : <><Upload className="w-4 h-4" /> {t('common.upload')}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
