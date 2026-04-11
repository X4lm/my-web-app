import { useState, useEffect } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
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
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import {
  MessageSquare, Plus, Phone, Mail, FileText,
  MoreHorizontal, Pencil, Trash2, Search, Loader2,
} from 'lucide-react'

const CHANNEL_OPTIONS = [
  { value: 'phone', label: 'Phone Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'in_person', label: 'In Person', icon: FileText },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'other', label: 'Other', icon: FileText },
]

const CHANNEL_LABELS = Object.fromEntries(CHANNEL_OPTIONS.map(c => [c.value, c.label]))

const DIRECTION_OPTIONS = [
  { value: 'outgoing', label: 'Outgoing' },
  { value: 'incoming', label: 'Incoming' },
]

export default function CommunicationLog({ propertyId }) {
  const { currentUser } = useAuth()
  const { formatDateTime } = useLocale()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const colPath = `users/${currentUser.uid}/properties/${propertyId}/communications`

  const [form, setForm] = useState({
    contactName: '', channel: 'phone', direction: 'outgoing',
    subject: '', notes: '',
  })

  useEffect(() => {
    const q = query(collection(db, colPath), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, (err) => {
      console.error('[Firestore] Communications listen error:', err)
      setLoading(false)
    })
    return unsub
  }, [colPath])

  function openAdd() {
    setEditing(null)
    setForm({ contactName: '', channel: 'phone', direction: 'outgoing', subject: '', notes: '' })
    setDialogOpen(true)
  }

  function openEdit(msg) {
    setEditing(msg)
    setForm({
      contactName: msg.contactName || '',
      channel: msg.channel || 'phone',
      direction: msg.direction || 'outgoing',
      subject: msg.subject || '',
      notes: msg.notes || '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.contactName.trim() || !form.subject.trim()) return
    setSaving(true)
    try {
      const authorName = currentUser.displayName || currentUser.email || 'Unknown'
      const data = { ...form, author: authorName }
      if (editing) {
        await updateDoc(doc(db, colPath, editing.id), { ...data, updatedAt: serverTimestamp() })
      } else {
        await addDoc(collection(db, colPath), { ...data, createdAt: serverTimestamp() })
      }
      setDialogOpen(false)
      setEditing(null)
    } catch (err) {
      console.error('[Firestore] Communication save error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this communication log?')) return
    try {
      await deleteDoc(doc(db, colPath, id))
    } catch (err) {
      console.error('[Firestore] Communication delete error:', err)
    }
  }

  const filtered = messages.filter(m => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      (m.contactName || '').toLowerCase().includes(s) ||
      (m.subject || '').toLowerCase().includes(s) ||
      (m.notes || '').toLowerCase().includes(s)
    )
  })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Communication Log
            </CardTitle>
            <Button onClick={openAdd} size="sm">
              <Plus className="w-4 h-4" /> Log Communication
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search communications..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-medium">
                {messages.length === 0 ? 'No communications logged' : 'No matches found'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {messages.length === 0
                  ? 'Track calls, emails, and messages with tenants and vendors.'
                  : 'Try a different search term.'}
              </p>
              {messages.length === 0 && (
                <Button onClick={openAdd} size="sm" className="mt-4">
                  <Plus className="w-4 h-4" /> Log Communication
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead className="hidden sm:table-cell">Direction</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(msg => (
                    <TableRow key={msg.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDateTime(msg.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{msg.contactName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {CHANNEL_LABELS[msg.channel] || msg.channel}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={msg.direction === 'incoming' ? 'outline' : 'default'} className="text-[10px]">
                          {msg.direction === 'incoming' ? 'Incoming' : 'Outgoing'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{msg.subject}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(msg)}>
                              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(msg.id)}
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!saving) setDialogOpen(open) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Communication' : 'Log Communication'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Contact Name *</Label>
              <Input
                value={form.contactName}
                onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                placeholder="Tenant or vendor name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Channel</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={form.channel}
                  onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
                >
                  {CHANNEL_OPTIONS.map(ch => (
                    <option key={ch.value} value={ch.value}>{ch.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={form.direction}
                  onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}
                >
                  {DIRECTION_OPTIONS.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="Brief description"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Detailed notes about the communication..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.contactName.trim() || !form.subject.trim()}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : editing ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
