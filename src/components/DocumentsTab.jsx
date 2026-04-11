import { useState, useEffect, useRef } from 'react'
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import app, { db } from '@/firebase/config'
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

const DOC_CATEGORIES = [
  { value: 'title_deed', label: 'Title Deed' },
  { value: 'lease_agreement', label: 'Lease Agreement' },
  { value: 'ejari', label: 'Ejari Certificate' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'municipality_permit', label: 'Municipality Permit' },
  { value: 'noc', label: 'NOC Letter' },
  { value: 'dewa', label: 'DEWA Document' },
  { value: 'chiller', label: 'Chiller Agreement' },
  { value: 'tenant_id', label: 'Tenant ID/Passport' },
  { value: 'tenant_visa', label: 'Tenant Visa' },
  { value: 'trade_license', label: 'Trade License' },
  { value: 'salary_certificate', label: 'Salary Certificate' },
  { value: 'maintenance_invoice', label: 'Maintenance Invoice' },
  { value: 'inspection_report', label: 'Inspection Report' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'other', label: 'Other' },
]

const CATEGORY_LABELS = Object.fromEntries(DOC_CATEGORIES.map(c => [c.value, c.label]))

export default function DocumentsTab({ propertyId }) {
  const { currentUser } = useAuth()
  const { formatDateTime } = useLocale()
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
      console.error('[Firestore] Documents listen error:', err)
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
      console.error('[Documents] Upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(docItem) {
    if (!window.confirm(`Delete "${docItem.name}"?`)) return
    try {
      await deleteDoc(doc(db, colPath, docItem.id))
      if (docItem.storagePath) {
        try {
          const storage = getStorage(app)
          await deleteObject(ref(storage, docItem.storagePath))
        } catch { /* storage delete may fail if already removed */ }
      }
    } catch (err) {
      console.error('[Documents] Delete error:', err)
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
                  {expiredDocs.length} expired document{expiredDocs.length > 1 ? 's' : ''}
                </span>
              )}
              {soonExpiring.length > 0 && (
                <span className="text-amber-600 font-medium">
                  {soonExpiring.length} expiring within 30 days
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
              <FolderOpen className="w-4 h-4" /> Documents ({documents.length})
            </CardTitle>
            <Button onClick={openAdd} size="sm">
              <Plus className="w-4 h-4" /> Upload
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and filter */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
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
              <option value="all">All Types</option>
              {DOC_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-medium">
                {documents.length === 0 ? 'No documents uploaded' : 'No matches found'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Upload leases, permits, invoices, tenant IDs, and more.
              </p>
              {documents.length === 0 && (
                <Button onClick={openAdd} size="sm" className="mt-4">
                  <Plus className="w-4 h-4" /> Upload Document
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
                          <Badge variant="outline" className="text-[10px]">Unit {docItem.unitNumber}</Badge>
                        )}
                        {isExpired && <Badge variant="destructive" className="text-[10px]">Expired</Badge>}
                        {isSoon && <Badge variant="warning" className="text-[10px]">Expiring Soon</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {docItem.fileName} {docItem.fileSize ? `(${formatFileSize(docItem.fileSize)})` : ''}
                        {docItem.expiryDate ? ` · Expires: ${docItem.expiryDate}` : ''}
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
                              <ExternalLink className="mr-2 h-3.5 w-3.5" /> Open
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(docItem)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
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
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Document Name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Lease Agreement - Unit 101"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
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
                <Label>Unit # (optional)</Label>
                <Input
                  value={form.unitNumber}
                  onChange={e => setForm(f => ({ ...f, unitNumber: e.target.value }))}
                  placeholder="e.g. 101"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Expiry Date (optional)</Label>
              <Input
                type="date"
                value={form.expiryDate}
                onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Additional notes"
              />
            </div>
            <div className="space-y-2">
              <Label>File *</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={uploading}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading || !form.name.trim()}>
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
