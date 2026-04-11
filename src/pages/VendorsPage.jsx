import { useState, useEffect } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Wrench, Phone, Mail, Star } from 'lucide-react'

const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

const CATEGORIES = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  hvac: 'HVAC',
  cleaning: 'Cleaning',
  painting: 'Painting',
  carpentry: 'Carpentry',
  pest_control: 'Pest Control',
  landscaping: 'Landscaping',
  security: 'Security',
  general: 'General Maintenance',
  other: 'Other',
}

const EMPTY = {
  name: '', phone: '', email: '', category: 'general',
  tradeLicense: '', rating: '', notes: '', active: true,
}

export default function VendorsPage() {
  const { currentUser } = useAuth()
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const colPath = `users/${currentUser.uid}/vendors`

  useEffect(() => {
    const q = query(collection(db, colPath), orderBy('name'))
    const unsub = onSnapshot(q, (snap) => {
      setVendors(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [colPath])

  const filtered = vendors.filter(v => {
    if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter !== 'all' && v.category !== categoryFilter) return false
    return true
  })

  function openAdd() {
    setEditing(null)
    setForm(EMPTY)
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(v) {
    setEditing(v)
    setForm({ ...EMPTY, ...v })
    setErrors({})
    setDialogOpen(true)
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }))
  }

  async function handleSave(e) {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Required'
    if (!form.phone.trim()) errs.phone = 'Required'
    if (Object.keys(errs).length) return setErrors(errs)

    setSaving(true)
    try {
      const data = { ...form, rating: form.rating ? Number(form.rating) : '' }
      if (editing) {
        await updateDoc(doc(db, colPath, editing.id), { ...data, updatedAt: serverTimestamp() })
      } else {
        await addDoc(collection(db, colPath), { ...data, createdAt: serverTimestamp() })
      }
      setDialogOpen(false)
      setEditing(null)
    } catch (err) {
      console.error('[Vendors] Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this vendor?')) return
    try {
      await deleteDoc(doc(db, colPath, id))
    } catch (err) {
      console.error('[Vendors] Delete error:', err)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
            <p className="text-muted-foreground text-sm">Manage your contractors and service providers.</p>
          </div>
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Add Vendor
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All Categories</option>
                {Object.entries(CATEGORIES).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-sm text-muted-foreground py-12 text-center">Loading vendors...</p>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Wrench className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <h3 className="text-sm font-medium">No vendors found</h3>
                <p className="text-sm text-muted-foreground mt-1">Add your contractors and service providers.</p>
                <Button onClick={openAdd} size="sm" className="mt-4">
                  <Plus className="w-4 h-4" /> Add Vendor
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="hidden sm:table-cell">Phone</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="hidden lg:table-cell">Rating</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(v => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{v.name}</p>
                            {v.tradeLicense && (
                              <p className="text-xs text-muted-foreground">TL: {v.tradeLicense}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{CATEGORIES[v.category] || v.category}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <a href={`tel:${v.phone}`} className="text-sm flex items-center gap-1 text-muted-foreground hover:text-foreground">
                            <Phone className="w-3 h-3" /> {v.phone}
                          </a>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {v.email ? (
                            <a href={`mailto:${v.email}`} className="text-sm flex items-center gap-1 text-muted-foreground hover:text-foreground">
                              <Mail className="w-3 h-3" /> {v.email}
                            </a>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {v.rating ? (
                            <span className="flex items-center gap-1 text-sm">
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {v.rating}/5
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(v)}>
                                <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(v.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!saving) setDialogOpen(open) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
            <DialogDescription>Manage contractor and service provider details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Company / Vendor name</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. ABC Maintenance LLC" />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+971 ..." />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="vendor@email.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <select value={form.category} onChange={e => set('category', e.target.value)} className={SELECT_CLASS}>
                  {Object.entries(CATEGORIES).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Rating (1-5)</Label>
                <Input type="number" min="1" max="5" value={form.rating} onChange={e => set('rating', e.target.value)} placeholder="e.g. 4" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Trade license number</Label>
              <Input value={form.tradeLicense} onChange={e => set('tradeLicense', e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Vendor'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
