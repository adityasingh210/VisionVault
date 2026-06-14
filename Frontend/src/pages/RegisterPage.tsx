import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/api/client'

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /\d/.test(p) },
  { label: 'One lowercase letter',  test: (p: string) =>/[a-z]/.test(p) },
]

export default function RegisterPage() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)

  const { login: storeLogin } = useAuthStore()

  const register = useMutation({
    mutationFn: authApi.register,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name || !email || !password) {
      setError('Please fill in all fields.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    try {
      const res = await register.mutateAsync({ name, email, password })
      storeLogin(res.user, res.tokens.accessToken)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    }
  }

  const passedRules = PASSWORD_RULES.filter((r) => r.test(password))
  const showStrength = focused && password.length > 0

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Create your account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Start organizing your photos with AI
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium text-foreground">
            Full name
          </label>
          <Input
            id="name"
            type="text"
            placeholder="Jane Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            autoFocus
            className="h-10"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="h-10"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused(true)}
              autoComplete="new-password"
              className="h-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Password strength meter */}
          {showStrength && (
            <div className="space-y-2 pt-1 animate-fade-in">
              {/* Strength bar */}
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-all duration-300',
                      i < passedRules.length
                        ? passedRules.length === 1
                          ? 'bg-destructive'
                          : passedRules.length === 2
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                        : 'bg-border'
                    )}
                  />
                ))}
              </div>
              <div className="space-y-1">
                {PASSWORD_RULES.map((rule) => {
                  const passed = rule.test(password)
                  return (
                    <div key={rule.label} className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors',
                          passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-border text-muted-foreground'
                        )}
                      >
                        {passed && <Check size={9} />}
                      </div>
                      <span
                        className={cn(
                          'text-xs transition-colors',
                          passed ? 'text-emerald-400' : 'text-muted-foreground'
                        )}
                      >
                        {rule.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-10 mt-2"
          disabled={register.isPending}
        >
          {register.isPending ? (
            <>
              <Loader2 size={15} className="mr-2 animate-spin" />
              Creating account…
            </>
          ) : (
            <>
              Create account
              <ArrowRight size={15} className="ml-2" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            to="/login"
            className={cn(
              'font-medium text-primary hover:text-primary/80 transition-colors',
              'underline underline-offset-4'
            )}
          >
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 pt-6 border-t border-border">
        <p className="text-xs text-center text-muted-foreground">
          By creating an account you agree to our{' '}
          <span className="text-primary/80 cursor-pointer hover:text-primary">Terms</span>
          {' '}and{' '}
          <span className="text-primary/80 cursor-pointer hover:text-primary">Privacy Policy</span>
        </p>
      </div>
    </div>
  )
}