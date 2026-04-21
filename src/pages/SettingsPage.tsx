import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useAccountStore } from '@/store/useAccountStore'
import { ACCOUNT_TYPE_LABELS } from '@/types'
import type { AccountType } from '@/types'

const ACCOUNT_TYPES: AccountType[] = ['asset', 'liability', 'equity', 'revenue', 'expense']

export function SettingsPage() {
  const { accounts, addAccount, deleteAccount } = useAccountStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('expense')

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    addAccount(name.trim(), type)
    setName('')
    setOpen(false)
  }

  const grouped = ACCOUNT_TYPES.map((t) => ({
    type: t,
    label: ACCOUNT_TYPE_LABELS[t],
    accounts: accounts.filter((a) => a.type === t),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">계정 설정</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> 계정 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 계정과목 추가</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="acc-name">계정명</Label>
                <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 비상금통장" required />
              </div>
              <div className="space-y-1.5">
                <Label>유형</Label>
                <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">추가</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {grouped.map(({ type, label, accounts: accs }) => (
          <Card key={type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Badge variant={type}>{label}</Badge>
                <span className="text-muted-foreground font-normal">{accs.length}개</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {accs.length === 0 ? (
                <p className="text-sm text-muted-foreground">계정이 없습니다.</p>
              ) : (
                <ul className="space-y-1">
                  {accs.map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <span className="text-sm">{a.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteAccount(a.id)}
                        disabled={a.isDefault}
                        title={a.isDefault ? '기본 계정은 삭제할 수 없습니다' : '삭제'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
