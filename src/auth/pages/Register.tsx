import { useMemo, useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import type { UserRole } from '@/auth/authRedirect'
import { redirectPathForRole } from '@/auth/authRedirect'


type RoleForSignup = Exclude<UserRole, 'OPERATOR'>

export default function Register() {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const { signUp, refreshProfile } = useAuth()

  const [role, setRole] = useState<RoleForSignup>('SHIPPER')
    useEffect(() => {
    const r = (searchParams.get('role') ?? '').toUpperCase()
    if (r === 'DRIVER' || r === 'SHIPPER') {
      setRole(r as RoleForSignup)
    }
  }, [searchParams])


  // comuns
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // shipper
  const [companyName, setCompanyName] = useState('')
  const [documentType, setDocumentType] = useState<'CNPJ' | 'CPF'>('CNPJ')
  const [documentNumber, setDocumentNumber] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  // driver
  const [baseCity, setBaseCity] = useState('')
  const [baseState, setBaseState] = useState('')
  const [cnhCategory, setCnhCategory] = useState('E')
  const [yearsExperience, setYearsExperience] = useState<number>(0)

  const [vehicleLabel, setVehicleLabel] = useState('')
  const [vehicleBodyType, setVehicleBodyType] = useState('PRANCHA')
  const [maxPayloadKg, setMaxPayloadKg] = useState<number>(0)
  const [hasWinch, setHasWinch] = useState(false)
  const [hasCrane, setHasCrane] = useState(false)

  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const requiredOk = useMemo(() => {
    if (!email.trim() || !password || !fullName.trim() || !phone.trim()) return false

    if (role === 'SHIPPER') {
      return (
        companyName.trim() &&
        documentNumber.trim() &&
        city.trim() &&
        state.trim() &&
        contactName.trim() &&
        contactPhone.trim()
      )
    }

    return (
      baseCity.trim() &&
      baseState.trim() &&
      cnhCategory.trim() &&
      vehicleLabel.trim() &&
      vehicleBodyType.trim() &&
      maxPayloadKg > 0
    )
  }, [
    email,
    password,
    fullName,
    phone,
    role,
    companyName,
    documentNumber,
    city,
    state,
    contactName,
    contactPhone,
    baseCity,
    baseState,
    cnhCategory,
    vehicleLabel,
    vehicleBodyType,
    maxPayloadKg,
  ])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!requiredOk) {
      setErr('Preencha todos os campos obrigatórios.')
      return
    }

    setBusy(true)
    try {
      await signUp({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phone: phone.trim(),
        role,
        shipper:
          role === 'SHIPPER'
            ? {
                companyName: companyName.trim(),
                documentType,
                documentNumber: documentNumber.trim(),
                city: city.trim(),
                state: state.trim().toUpperCase(),
                contactName: contactName.trim(),
                contactPhone: contactPhone.trim(),
              }
            : undefined,
        driver:
          role === 'DRIVER'
            ? {
                baseCity: baseCity.trim(),
                baseState: baseState.trim().toUpperCase(),
                cnhCategory: cnhCategory.trim().toUpperCase(),
                yearsExperience: Number(yearsExperience) || 0,
                vehicleLabel: vehicleLabel.trim(),
                vehicleBodyType: vehicleBodyType.trim().toUpperCase(),
                maxPayloadKg: Number(maxPayloadKg) || 0,
                hasWinch,
                hasCrane,
              }
            : undefined,
      })

      await refreshProfile()

      nav(redirectPathForRole(role), { replace: true })
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao cadastrar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Criar conta</h1>
          <p className="text-sm text-slate-500">Cadastre seus dados.</p>
        </div>

        {err && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{err}</div>}

        <form className="space-y-4" onSubmit={onSubmit}>
          {/* papel */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Tipo de conta</label>
              <select
                className="w-full rounded-xl border p-3"
                value={role}
                onChange={(e) => setRole(e.target.value as RoleForSignup)}
              >
                <option value="SHIPPER">Empresa / Dono do equipamento</option>
                <option value="DRIVER">Motorista</option>
              </select>
              <p className="text-xs text-slate-500">
                Admin não pode ser criado por aqui.
              </p>
            </div>
          </div>

          {/* comuns */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nome completo *</label>
              <input className="w-full rounded-xl border p-3" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Telefone *</label>
              <input className="w-full rounded-xl border p-3" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(DD) 9xxxx-xxxx" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Email *</label>
              <input className="w-full rounded-xl border p-3" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Senha *</label>
              <input className="w-full rounded-xl border p-3" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </div>
          </div>

          {/* específicos */}
          {role === 'SHIPPER' ? (
            <div className="rounded-2xl border p-4 space-y-3">
              <h2 className="font-semibold">Dados da empresa</h2>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Razão/Nome da empresa *</label>
                  <input className="w-full rounded-xl border p-3" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Tipo documento *</label>
                  <select className="w-full rounded-xl border p-3" value={documentType} onChange={(e) => setDocumentType(e.target.value as any)}>
                    <option value="CNPJ">CNPJ</option>
                    <option value="CPF">CPF</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Número do documento *</label>
                  <input className="w-full rounded-xl border p-3" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Cidade *</label>
                  <input className="w-full rounded-xl border p-3" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Estado (UF) *</label>
                  <input className="w-full rounded-xl border p-3" value={state} onChange={(e) => setState(e.target.value)} placeholder="GO" />
                </div>
              </div>

              <h3 className="font-medium pt-2">Contato</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nome do contato *</label>
                  <input className="w-full rounded-xl border p-3" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Telefone do contato *</label>
                  <input className="w-full rounded-xl border p-3" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border p-4 space-y-3">
              <h2 className="font-semibold">Dados do motorista</h2>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Cidade base *</label>
                  <input className="w-full rounded-xl border p-3" value={baseCity} onChange={(e) => setBaseCity(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Estado base (UF) *</label>
                  <input className="w-full rounded-xl border p-3" value={baseState} onChange={(e) => setBaseState(e.target.value)} placeholder="GO" />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Categoria CNH *</label>
                  <input className="w-full rounded-xl border p-3" value={cnhCategory} onChange={(e) => setCnhCategory(e.target.value)} placeholder="E" />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Anos de experiência *</label>
                  <input className="w-full rounded-xl border p-3" type="number" value={yearsExperience} onChange={(e) => setYearsExperience(Number(e.target.value))} min={0} />
                </div>
              </div>

              <h3 className="font-medium pt-2">Veículo principal</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Descrição *</label>
                  <input className="w-full rounded-xl border p-3" value={vehicleLabel} onChange={(e) => setVehicleLabel(e.target.value)} placeholder="Cavalo + prancha 3 eixos" />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Tipo carroceria *</label>
                  <input className="w-full rounded-xl border p-3" value={vehicleBodyType} onChange={(e) => setVehicleBodyType(e.target.value)} placeholder="PRANCHA" />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Carga máxima (kg) *</label>
                  <input className="w-full rounded-xl border p-3" type="number" value={maxPayloadKg} onChange={(e) => setMaxPayloadKg(Number(e.target.value))} min={0} />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={hasWinch} onChange={(e) => setHasWinch(e.target.checked)} />
                    Guincho
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={hasCrane} onChange={(e) => setHasCrane(e.target.checked)} />
                    Munck/Guindaste
                  </label>
                </div>
              </div>
            </div>
          )}

          <button
            className="w-full rounded-xl bg-slate-900 text-white p-3 font-medium disabled:opacity-60"
            disabled={busy || !requiredOk}
          >
            {busy ? 'Criando...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-sm text-slate-600">
          Já tem conta?{' '}
          <Link className="text-slate-900 font-medium" to="/auth/login">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
