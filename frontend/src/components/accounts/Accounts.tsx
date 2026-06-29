import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, RefreshCw, Users, Phone, Clock } from 'lucide-react'
import { getAccounts, sendOTP, verifyOTP, deleteAccount, reconnectAccount } from '../../lib/api'
import { Account } from '../../types'
import { PageHeader, StatusBadge, Table, Th, Td, EmptyState, Modal, Skeleton } from '../ui'
import { useToast } from '../../lib/toast'
import { formatDistanceToNow } from 'date-fns'

export function Accounts() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [form, setForm] = useState({ phone_number: '', api_id: '', api_hash: '' })
  const [otpData, setOtpData] = useState({ code: '', phone_code_hash: '', password: '' })
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const { data: accounts, isLoading } = useQuery({ queryKey: ['accounts'], queryFn: getAccounts })

  const sendOTPMutation = useMutation({
    mutationFn: sendOTP,
    onSuccess: (data) => {
      setOtpData(prev => ({ ...prev, phone_code_hash: data.phone_code_hash }))
      setStep('otp')
      toast('OTP sent to your phone', 'success')
    },
    onError: (e: any) => toast(e.response?.data?.detail || 'Failed to send OTP', 'error'),
  })

  const verifyMutation = useMutation({
    mutationFn: verifyOTP,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      setShowAdd(false)
      setStep('form')
      setForm({ phone_number: '', api_id: '', api_hash: '' })
      toast('Account added successfully', 'success')
    },
    onError: (e: any) => {
      const detail = e.response?.data?.detail || 'Verification failed'
      if (detail.includes('two-factor') || detail.includes('password')) {
        toast('2FA required — enter your password', 'warning')
      } else {
        toast(detail, 'error')
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); toast('Account removed', 'success') },
  })

  const reconnectMutation = useMutation({
    mutationFn: reconnectAccount,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); toast('Account reconnected', 'success') },
  })

  return (
    <div>
      <PageHeader
        title="Telegram Accounts"
        subtitle="Manage your connected Telegram accounts"
        actions={
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
            <Plus size={14} /> Add Account
          </button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !accounts?.length ? (
        <EmptyState
          icon={Users}
          title="No accounts yet"
          description="Add a Telegram account to start scraping groups and managing leads."
          action={<button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2"><Plus size={14} /> Add Account</button>}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Account</Th>
              <Th>Phone</Th>
              <Th>Status</Th>
              <Th>Last Active</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc: Account) => (
              <tr key={acc.id} className="table-row">
                <Td>
                  <div>
                    <p className="font-medium">{acc.name || 'Unknown'}</p>
                    {acc.username && <p className="text-xs text-text-muted">@{acc.username}</p>}
                  </div>
                </Td>
                <Td>
                  <span className="font-mono text-text-secondary flex items-center gap-1.5">
                    <Phone size={12} />{acc.phone_number}
                  </span>
                </Td>
                <Td><StatusBadge status={acc.status} /></Td>
                <Td>
                  <span className="text-text-secondary flex items-center gap-1.5">
                    <Clock size={12} />
                    {acc.last_active ? formatDistanceToNow(new Date(acc.last_active), { addSuffix: true }) : 'Never'}
                  </span>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => reconnectMutation.mutate(acc.id)}
                      className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded transition-colors"
                      title="Reconnect"
                    >
                      <RefreshCw size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(acc.id)}
                      className="p-1.5 text-text-muted hover:text-accent-red hover:bg-red-950/30 rounded transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Add Account Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setStep('form') }} title="Add Telegram Account">
        {step === 'form' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Phone Number</label>
              <input
                className="input"
                placeholder="+1234567890"
                value={form.phone_number}
                onChange={e => setForm(p => ({ ...p, phone_number: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">API ID</label>
              <input
                className="input font-mono"
                placeholder="12345678"
                value={form.api_id}
                onChange={e => setForm(p => ({ ...p, api_id: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">API Hash</label>
              <input
                className="input font-mono"
                placeholder="abc123..."
                value={form.api_hash}
                onChange={e => setForm(p => ({ ...p, api_hash: e.target.value }))}
              />
              <p className="text-xs text-text-muted mt-1">Get credentials at <a href="https://my.telegram.org" target="_blank" className="text-accent-blue hover:underline">my.telegram.org</a></p>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => sendOTPMutation.mutate(form)}
                disabled={sendOTPMutation.isPending || !form.phone_number || !form.api_id || !form.api_hash}
                className="btn-primary flex-1"
              >
                {sendOTPMutation.isPending ? 'Sending...' : 'Send OTP'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">Enter the code sent to <span className="text-text-primary font-medium">{form.phone_number}</span></p>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Verification Code</label>
              <input
                className="input font-mono text-center text-lg tracking-widest"
                placeholder="12345"
                maxLength={5}
                value={otpData.code}
                onChange={e => setOtpData(p => ({ ...p, code: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">2FA Password (if enabled)</label>
              <input
                type="password"
                className="input"
                placeholder="Leave blank if not set"
                value={otpData.password}
                onChange={e => setOtpData(p => ({ ...p, password: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setStep('form')} className="btn-secondary flex-1">Back</button>
              <button
                onClick={() => verifyMutation.mutate({
                  phone_number: form.phone_number,
                  code: otpData.code,
                  phone_code_hash: otpData.phone_code_hash,
                  password: otpData.password || undefined,
                })}
                disabled={verifyMutation.isPending || !otpData.code}
                className="btn-primary flex-1"
              >
                {verifyMutation.isPending ? 'Verifying...' : 'Verify & Add'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal open={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)} title="Remove Account">
        <p className="text-sm text-text-secondary mb-5">This will remove the account and stop all associated jobs. This cannot be undone.</p>
        <div className="flex gap-2">
          <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => { deleteMutation.mutate(deleteConfirm!); setDeleteConfirm(null) }}
            className="btn-danger flex-1"
          >
            Remove Account
          </button>
        </div>
      </Modal>
    </div>
  )
}
