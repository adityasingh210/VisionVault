import { useState } from 'react'
import {
  User,
  Mail,
  Shield,
  Palette,
  Link2,
  LogOut,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Camera,
  Bell,
  Globe,
  Moon,
  Save,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/store/authStore'
import { useMe, useLogout } from '@/hooks/useApi'
import { cn } from '@/lib/utils'

// ─── Settings Section ─────────────────────────────────────────────────────────

function SettingsSection({
  title,
  description,
  icon,
  children,
}: {
  title: string
  description?: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-start gap-3 px-5 py-4 border-b border-border bg-secondary/30">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 text-primary">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

// ─── Settings Row ─────────────────────────────────────────────────────────────

function SettingsRow({
  label,
  description,
  children,
  className,
}: {
  label: string
  description?: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-3', className)}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 shrink-0',
        enabled ? 'bg-primary' : 'bg-border'
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200',
          enabled ? 'translate-x-4' : 'translate-x-1'
        )}
      />
    </button>
  )
}

// ─── Profile Section ──────────────────────────────────────────────────────────

function ProfileSection() {
  const { user } = useAuthStore()
  const { isLoading } = useMe()

  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const initials = (user?.name || user?.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleSave = async () => {
    setSaving(true)
    // Simulate save — wire to real endpoint when available
    await new Promise((r) => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <SettingsSection
      title="Profile"
      description="Your personal information"
      icon={<User size={14} />}
    >
      <div className="space-y-5">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          {isLoading ? (
            <Skeleton className="w-14 h-14 rounded-full" />
          ) : (
            <div className="relative group">
              <Avatar className="w-14 h-14">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="text-base font-semibold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <Camera size={14} className="text-white" />
              </div>
            </div>
          )}
          <div>
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-32 mb-1.5" />
                <Skeleton className="h-3 w-44" />
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground">{user?.name || 'Unnamed'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Display Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Input
                value={user?.email || ''}
                readOnly
                disabled
                className="pr-8"
              />
              <Mail size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || isLoading}
            className="gap-1.5"
          >
            {saving ? (
              <Loader2 size={13} className="animate-spin" />
            ) : saved ? (
              <CheckCircle2 size={13} />
            ) : (
              <Save size={13} />
            )}
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
          </Button>
        </div>
      </div>
    </SettingsSection>
  )
}

// ─── Connected Services ───────────────────────────────────────────────────────

function ConnectedServicesSection() {
  const [googleConnected] = useState(false)

  return (
    <SettingsSection
      title="Connected Services"
      description="Manage integrations and external connections"
      icon={<Link2 size={14} />}
    >
      <div className="divide-y divide-border">
        <SettingsRow
          label="Google Photos"
          description="Import and sync photos from your Google Photos library"
        >
          <div className="flex items-center gap-2 shrink-0">
            {googleConnected ? (
              <>
                <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                  <CheckCircle2 size={12} />
                  Connected
                </span>
                <Button variant="outline" size="sm" className="text-xs h-7 px-2.5">
                  Disconnect
                </Button>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertCircle size={12} />
                  Not connected
                </span>
                <Button size="sm" className="text-xs h-7 px-2.5 gap-1">
                  <Globe size={11} />
                  Connect
                </Button>
              </>
            )}
          </div>
        </SettingsRow>
      </div>
    </SettingsSection>
  )
}

// ─── Preferences ──────────────────────────────────────────────────────────────

function PreferencesSection() {
  const [notifications, setNotifications] = useState(true)
  const [aiFeatures, setAiFeatures] = useState(true)
  const [autoBackup] = useState(false)

  return (
    <SettingsSection
      title="Preferences"
      description="Customize your VisionVault experience"
      icon={<Bell size={14} />}
    >
      <div className="divide-y divide-border">
        <SettingsRow
          label="Email notifications"
          description="Receive updates about your photo library and AI processing"
        >
          <Toggle enabled={notifications} onChange={setNotifications} />
        </SettingsRow>
        <SettingsRow
          label="AI features"
          description="Enable automatic face recognition, categorization, and event detection"
        >
          <Toggle enabled={aiFeatures} onChange={setAiFeatures} />
        </SettingsRow>
        <SettingsRow
          label="Auto backup"
          description="Automatically backup new uploads to connected services"
        >
          <Toggle enabled={autoBackup} onChange={() => {}} />
        </SettingsRow>
      </div>
    </SettingsSection>
  )
}

// ─── Appearance ───────────────────────────────────────────────────────────────

function AppearanceSection() {
  return (
    <SettingsSection
      title="Appearance"
      description="Customize how VisionVault looks"
      icon={<Palette size={14} />}
    >
      <div className="divide-y divide-border">
        <SettingsRow
          label="Theme"
          description="Choose between light, dark, or system default"
        >
          <div className="flex gap-1.5 shrink-0">
            {(['Light', 'Dark', 'System'] as const).map((t) => (
              <button
                key={t}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                  t === 'System'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {t === 'Dark' && <Moon size={10} />}
                {t}
              </button>
            ))}
          </div>
        </SettingsRow>
      </div>
    </SettingsSection>
  )
}

// ─── Account Section ──────────────────────────────────────────────────────────

function AccountSection() {
  const { logout } = useAuthStore()
  const logoutMutation = useLogout()

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
    } finally {
      logout()
    }
  }

  return (
    <SettingsSection
      title="Account"
      description="Manage your account and data"
      icon={<Shield size={14} />}
    >
      <div className="divide-y divide-border">
        <SettingsRow
          label="Change password"
          description="Update your account password"
        >
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
            Update <ChevronRight size={12} />
          </button>
        </SettingsRow>
        <SettingsRow
          label="Export data"
          description="Download all your photos and data"
        >
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
            Download <ChevronRight size={12} />
          </button>
        </SettingsRow>
        <SettingsRow
          label="Delete account"
          description="Permanently delete your account and all data"
        >
          <button className="text-xs text-destructive hover:text-destructive/80 transition-colors shrink-0 font-medium">
            Delete
          </button>
        </SettingsRow>
      </div>

      {/* Logout */}
      <div className="mt-5 pt-5 border-t border-border">
        <Button
          variant="outline"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/5 hover:border-destructive/40"
        >
          {logoutMutation.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <LogOut size={14} />
          )}
          Sign out
        </Button>
      </div>
    </SettingsSection>
  )
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="min-h-full p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account, preferences, and connected services
        </p>
      </div>

      <div className="space-y-5">
        <ProfileSection />
        <ConnectedServicesSection />
        <PreferencesSection />
        <AppearanceSection />
        <AccountSection />
      </div>
    </div>
  )
}
