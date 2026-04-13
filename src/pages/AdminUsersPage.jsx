import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { logError } from '@/utils/logger'
import { useLocale } from '@/contexts/LocaleContext'
import { useAuth, ROLES } from '@/contexts/AuthContext'

import AppLayout from '@/components/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Search, MoreHorizontal, FileDown, Users, Loader2, ShieldCheck, Ban, RotateCcw, UserCog } from 'lucide-react'

const ALL_ROLES = Object.values(ROLES)

const ROLE_VARIANT = {
  admin: 'destructive',
  owner: 'default',
  property_manager: 'secondary',
  staff: 'secondary',
  vendor: 'outline',
  tenant: 'outline',
}

export default function AdminUsersPage() {
  const { t } = useLocale()
  const { currentUser, userProfile } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [propCounts, setPropCounts] = useState({}) // uid -> count

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')))
      const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setUsers(allUsers)

      // Count properties per owner
      const counts = {}
      const owners = allUsers.filter(u => u.role === 'owner' || u.role === 'admin')
      for (const owner of owners) {
        try {
          const propsSnap = await getDocs(collection(db, 'users', owner.id, 'properties'))
          counts[owner.id] = propsSnap.size
        } catch {
          counts[owner.id] = 0
        }
      }
      // For non-owners, count linked properties
      allUsers.forEach(u => {
        if (!counts[u.id]) {
          counts[u.id] = (u.linkedProperties || []).length
        }
      })
      setPropCounts(counts)
    } catch (err) {
      // load error
    } finally {
      setLoading(false)
    }
  }

  function formatTimestamp(ts) {
    if (!ts) return '—'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Filter users
  const filtered = users.filter(u => {
    const matchesSearch = !search ||
      (u.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  async function handleSuspend(user) {
    const isSuspended = user.suspended
    const msg = isSuspended ? t('admin.reactivateConfirm') : t('admin.suspendConfirm')
    if (!window.confirm(msg)) return
    try {
      await updateDoc(doc(db, 'users', user.id), { suspended: !isSuspended })
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, suspended: !isSuspended } : u))
    } catch (err) {
      // suspend error
    }
  }

  async function handleChangeRole(user, newRole) {
    const msg = t('admin.changeRoleConfirm').replace('{role}', t(`role.${newRole}`))
    if (!window.confirm(msg)) return
    try {
      await updateDoc(doc(db, 'users', user.id), { role: newRole })
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u))
    } catch (err) {
      logError('[AdminUsers] Role change error:', err)
    }
  }

  function exportCSV() {
    if (userProfile?.role !== 'admin') return
    const headers = ['Name', 'Email', 'Role', 'Signup Date', 'Last Login', 'Status', 'Properties']
    const rows = filtered.map(u => [
      u.displayName || '',
      u.email || '',
      u.role || 'owner',
      formatTimestamp(u.createdAt),
      formatTimestamp(u.lastLogin),
      u.suspended ? 'Suspended' : 'Active',
      propCounts[u.id] || 0,
    ])
    const esc = v => {
      let s = String(v).replace(/"/g, '""')
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
      return `"${s}"`
    }
    const csv = [headers.join(','), ...rows.map(r => r.map(esc).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('admin.usersTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('admin.usersSubtitle')}</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={loading}>
            <FileDown className="w-4 h-4" /> {t('admin.exportCsv')}
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('admin.searchUsers')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="ps-9"
                />
              </div>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">{t('admin.allRoles')}</option>
                {ALL_ROLES.map(r => (
                  <option key={r} value={r}>{t(`role.${r}`)}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {filtered.length} {t('admin.userCount')}
            </p>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm text-muted-foreground">{t('common.loading')}</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">{t('admin.noUsers')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.name')}</TableHead>
                      <TableHead>{t('common.email')}</TableHead>
                      <TableHead>{t('team.role')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('admin.signupDate')}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('admin.lastLogin')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead className="hidden sm:table-cell text-center">{t('admin.propertiesCount')}</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(u => (
                      <TableRow key={u.id} className={u.suspended ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">
                          {u.displayName || '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {u.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant={ROLE_VARIANT[u.role] || 'secondary'} className="text-[10px]">
                            {t(`role.${u.role || 'owner'}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {formatTimestamp(u.createdAt)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {formatTimestamp(u.lastLogin)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.suspended ? 'destructive' : 'success'} className="text-[10px]">
                            {u.suspended ? t('admin.statusSuspended') : t('admin.statusActive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-center text-sm">
                          {propCounts[u.id] || 0}
                        </TableCell>
                        <TableCell>
                          {u.id !== currentUser.uid && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {/* Suspend / Reactivate */}
                                <DropdownMenuItem onClick={() => handleSuspend(u)}>
                                  {u.suspended ? (
                                    <><RotateCcw className="mr-2 h-3.5 w-3.5" /> {t('admin.reactivate')}</>
                                  ) : (
                                    <><Ban className="mr-2 h-3.5 w-3.5 text-destructive" /> {t('admin.suspend')}</>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {/* Change Role */}
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                  <UserCog className="inline w-3 h-3 mr-1" /> {t('admin.changeRole')}
                                </DropdownMenuLabel>
                                {ALL_ROLES.filter(r => r !== u.role).map(r => (
                                  <DropdownMenuItem
                                    key={r}
                                    onClick={() => handleChangeRole(u, r)}
                                    className="ps-6"
                                  >
                                    <Badge variant={ROLE_VARIANT[r]} className="text-[9px] mr-2">{t(`role.${r}`)}</Badge>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
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
    </AppLayout>
  )
}
