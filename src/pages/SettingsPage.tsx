import { useState, useRef } from 'react'
import { Plus, Trash2, RotateCcw, Download, Upload, Database, Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AccountIcon } from '@/components/AccountIcon'
import { useAccountStore } from '@/store/useAccountStore'
import { useEntryStore } from '@/store/useEntryStore'
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_BADGE_CLASSES } from '@/types'
import { ICON_OPTIONS, COLOR_OPTIONS } from '@/lib/iconMap'
import { generateSampleEntries } from '@/lib/sampleData'
import { exportJSON, exportCSV, parseImportJSON } from '@/lib/exportImport'
import type { AccountType, Account } from '@/types'

const ACCOUNT_TYPES: AccountType[] = ['asset', 'liability', 'revenue', 'expense']

interface AccountFormState {
  name: string
  type: AccountType
  description: string
  color: string
  icon: string
}

const DEFAULT_FORM: AccountFormState = {
  name: '',
  type: 'expense',
  description: '',
  color: '#64748b',
  icon: 'more',
}

export function SettingsPage() {
  const { accounts, addAccount, updateAccount, deleteAccount, toggleActive, resetToDefaults, replaceAll } = useAccountStore()
  const { entries, addEntries, replaceAll: replaceEntries } = useEntryStore()

  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Account | null>(null)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [form, setForm] = useState<AccountFormState>(DEFAULT_FORM)
  const fileRef = useRef<HTMLInputElement>(null)

  function openAdd() {
    setForm(DEFAULT_FORM)
    setAddOpen(true)
  }

  function openEdit(account: Account) {
    setForm({ name: account.name, type: account.type, description: account.description ?? '', color: account.color, icon: account.icon })
    setEditTarget(account)
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    addAccount({ name: form.name.trim(), type: form.type, description: form.description, color: form.color, icon: form.icon })
    setAddOpen(false)
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget || !form.name.trim()) return
    updateAccount(editTarget.id, { name: form.name.trim(), type: form.type, description: form.description, color: form.color, icon: form.icon })
    setEditTarget(null)
  }

  function handleSampleData() {
    const samples = generateSampleEntries(accounts)
    addEntries(samples)
  }

  function handleExportJSON() {
    exportJSON(accounts, entries)
  }

  function handleExportCSV() {
    exportCSV(accounts, entries)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const data = parseImportJSON(text)
      if (!data) { alert('올바른 가계부 JSON 파일이 아닙니다.'); return }
      if (!confirm(`가져오기 시 기존 데이터가 모두 교체됩니다.\n계속하시겠습니까?`)) return
      replaceAll(data.accounts)
      replaceEntries(data.entries)
      alert('가져오기 완료!')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const grouped = ACCOUNT_TYPES.map((t) => ({
    type: t,
    label: ACCOUNT_TYPE_LABELS[t],
    accounts: accounts.filter((a) => a.type === t),
  }))

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">계정 설정</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setResetConfirm(true)} className="gap-1">
            <RotateCcw className="h-3.5 w-3.5" /> 기본값 초기화
          </Button>
          <Button size="sm" onClick={openAdd} className="gap-1">
            <Plus className="h-4 w-4" /> 계정 추가
          </Button>
        </div>
      </div>

      {/* 계정 목록 */}
      {grouped.map(({ type, label, accounts: accs }) => (
        <Card key={type}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACCOUNT_TYPE_BADGE_CLASSES[type]}`}>
                {label}
              </span>
              <span className="text-muted-foreground font-normal">{accs.length}개</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {accs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">계정이 없습니다.</p>
            ) : (
              <ul className="divide-y">
                {accs.map((account) => (
                  <li key={account.id} className="flex items-center justify-between py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <AccountIcon icon={account.icon} color={account.color} size="md" />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${!account.isActive ? 'text-muted-foreground line-through' : ''}`}>
                          {account.name}
                        </p>
                        {account.description && (
                          <p className="text-xs text-muted-foreground truncate">{account.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={account.isActive}
                        onCheckedChange={() => toggleActive(account.id)}
                        title={account.isActive ? '비활성화' : '활성화'}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(account)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => { if (confirm(`'${account.name}' 계정을 삭제할까요?`)) deleteAccount(account.id) }}
                        disabled={account.isDefault}
                        title={account.isDefault ? '기본 계정은 삭제 불가' : '삭제'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}

      {/* 데이터 관리 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4" /> 데이터 관리
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={handleSampleData} className="gap-1.5 justify-start">
              <Database className="h-4 w-4 text-purple-500" />
              샘플 데이터 생성 (3개월치)
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJSON} className="gap-1.5 justify-start">
              <Download className="h-4 w-4 text-blue-500" />
              JSON 내보내기
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 justify-start">
              <Download className="h-4 w-4 text-green-500" />
              CSV 내보내기
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5 justify-start">
              <Upload className="h-4 w-4 text-orange-500" />
              JSON 가져오기
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            * JSON 가져오기는 기존 데이터를 모두 교체합니다. CSV는 열람/분석용으로만 사용하세요.
          </p>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </CardContent>
      </Card>

      {/* 계정 추가 다이얼로그 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>계정 추가</DialogTitle></DialogHeader>
          <AccountFormBody form={form} onChange={setForm} onSubmit={handleAddSubmit} onCancel={() => setAddOpen(false)} submitLabel="추가" />
        </DialogContent>
      </Dialog>

      {/* 계정 수정 다이얼로그 */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>계정 수정</DialogTitle></DialogHeader>
          <AccountFormBody form={form} onChange={setForm} onSubmit={handleEditSubmit} onCancel={() => setEditTarget(null)} submitLabel="저장" />
        </DialogContent>
      </Dialog>

      {/* 초기화 확인 다이얼로그 */}
      <Dialog open={resetConfirm} onOpenChange={setResetConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>기본값으로 초기화</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">모든 계정이 기본 계정으로 교체됩니다. 거래 내역은 유지되지만 삭제된 계정 참조가 깨질 수 있습니다. 계속하시겠습니까?</p>
          <div className="flex gap-2 mt-2">
            <Button variant="destructive" className="flex-1" onClick={() => { resetToDefaults(); setResetConfirm(false) }}>
              초기화
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setResetConfirm(false)}>
              취소
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AccountFormBody({
  form, onChange, onSubmit, onCancel, submitLabel,
}: {
  form: AccountFormState
  onChange: (f: AccountFormState) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  submitLabel: string
}) {
  const set = (key: keyof AccountFormState, value: string) => onChange({ ...form, [key]: value })

  return (
    <form onSubmit={onSubmit} className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <Label>계정명</Label>
        <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="예: 비상금통장" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>유형</Label>
          <Select value={form.type} onValueChange={(v) => set('type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACCOUNT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>아이콘</Label>
          <Select value={form.icon} onValueChange={(v) => set('icon', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ICON_OPTIONS.map((o) => (
                <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>색상</Label>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onClick={() => set('color', c.value)}
              className={`h-7 w-7 rounded-full transition-all ${form.color === c.value ? 'ring-2 ring-offset-2 ring-foreground scale-110' : ''}`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>미리보기</Label>
        <div className="flex items-center gap-3 p-3 rounded-lg border">
          <AccountIcon icon={form.icon} color={form.color} size="md" />
          <span className="font-medium text-sm">{form.name || '계정명'}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${ACCOUNT_TYPE_BADGE_CLASSES[form.type]}`}>
            {ACCOUNT_TYPE_LABELS[form.type]}
          </span>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>설명 (선택)</Label>
        <Input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="계정에 대한 메모" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">{submitLabel}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>취소</Button>
      </div>
    </form>
  )
}
