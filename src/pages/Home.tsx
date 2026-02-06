import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import HeroCarousel from '@/shared/ui/HeroCarousel'

export default function Home() {
  const nav = useNavigate()
  const { profile } = useAuth()

  // Assets (coloque esses arquivos em /public)
  const BRAND_LOGO = '/brand/logo.png'
  const HERO_IMAGES = ['/hero/hero-1.jpg', '/hero/hero-2.jpg', '/hero/hero-3.jpg']
  const ABOUT_IMG_1 = '/home/about-1.jpg'
  const ABOUT_IMG_2 = '/home/about-2.jpg'

  // Contatos (edite aqui)
  const CONTACT_NAME = 'Entony Santos'
  const CONTACT_PHONE_DISPLAY = '+55 (62) 99634-9178'
  const CONTACT_PHONE_DIGITS = '5562996349178' // só números, com DDI 55
  const CONTACT_EMAIL = 'entony.santos@grupoener.eng.br'
  const HQ_ADDRESS = 'Grupo Enersolar Fazenda Caveiras - Rod GO060 Q.01 Sala 03, S/N - 74.445-357, Goiânia - GO'

  const WHATSAPP_LINK = `https://wa.me/${CONTACT_PHONE_DIGITS}`
  const TEL_LINK = `tel:+${CONTACT_PHONE_DIGITS}`
  const MAILTO_LINK = `mailto:${CONTACT_EMAIL}`

  const MAP_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(HQ_ADDRESS)}`
  const MAP_EMBED = `https://www.google.com/maps?q=${encodeURIComponent(HQ_ADDRESS)}&output=embed`

  const year = new Date().getFullYear()

  const loggedInPath = useMemo(() => {
    if (profile?.role === 'DRIVER') return '/driver'
    if (profile?.role === 'SHIPPER') return '/shipper'
    if (profile?.role === 'OPERATOR') return '/admin'
    return null
  }, [profile?.role])

  function goEntrar() {
    nav(loggedInPath ?? '/auth/login')
  }

  function goCadastrar() {
    nav('/auth/register')
  }

  // Botões do HERO
  function goSouMotorista() {
    if (profile?.role === 'DRIVER') {
      nav('/driver/trips/new')
      return
    }
    if (profile?.role === 'OPERATOR') {
      nav('/admin')
      return
    }
    nav('/auth/register?role=DRIVER')
  }

  function goTenhoCarga() {
    if (profile?.role === 'SHIPPER') {
      nav('/shipper/freights/new')
      return
    }
    if (profile?.role === 'OPERATOR') {
      nav('/admin')
      return
    }
    nav('/auth/register?role=SHIPPER')
  }

  return (
    <div id="top" className="bg-white text-text-main font-display">
      <header className="sticky top-0 z-50 w-full border-b border-solid border-border-dark bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-text-main">
            <img
              src={BRAND_LOGO}
              alt="Frete de Retorno"
              className="h-9 w-9 rounded-lg object-contain"
              loading="eager"
            />
            <h2 className="text-xl font-black tracking-tighter uppercase">Frete de Retorno</h2>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a className="text-text-main text-sm font-semibold hover:text-primary transition-colors" href="#top">
              Home
            </a>
            <a className="text-text-main text-sm font-semibold hover:text-primary transition-colors" href="#motorista">
              Sou Motorista
            </a>
            <a className="text-text-main text-sm font-semibold hover:text-primary transition-colors" href="#carga">
              Tenho Carga
            </a>
            <a className="text-text-main text-sm font-semibold hover:text-primary transition-colors" href="#sobre">
              Sobre
            </a>
          </nav>

          <div className="flex gap-3">
            <button
              onClick={goEntrar}
              className="rounded-lg h-10 px-5 bg-primary text-white text-sm font-bold hover:bg-red-800 transition-all"
            >
              Entrar
            </button>
            <button
              onClick={goCadastrar}
              className="rounded-lg h-10 px-5 bg-text-main text-white text-sm font-bold hover:bg-slate-800 transition-all"
            >
              Cadastrar
            </button>
          </div>
        </div>
      </header>

      {/* HERO com carrossel (automático, sem controles) */}
      <section className="relative">
        <HeroCarousel images={HERO_IMAGES} intervalMs={6500} showControls={false} minHeightClassName="min-h-[700px]">
          <div className="max-w-[960px] px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-red/10 border border-accent-red/20 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-red opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-red"></span>
              </span>
              <span className="text-accent-red text-xs font-bold uppercase tracking-widest">Tecnologia Grupo ENER</span>
            </div>

            <h1 className="text-text-main text-5xl md:text-7xl font-black leading-tight tracking-tight mb-6">
              Rentabilize sua volta para casa
            </h1>
            <p className="text-text-muted text-lg md:text-xl max-w-2xl mx-auto mb-10 font-medium">
              Conectamos donos de máquinas a motoristas independentes através de inteligência artificial para eliminar
              viagens vazias e maximizar lucros.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={goSouMotorista}
                className="min-w-[200px] rounded-xl h-14 bg-primary text-white text-lg font-bold shadow-lg shadow-primary/25 hover:translate-y-[-2px] transition-all"
              >
                Sou Motorista
              </button>
              <button
                onClick={goTenhoCarga}
                className="min-w-[200px] rounded-xl h-14 bg-white text-text-main text-lg font-bold border border-border-dark shadow-sm hover:bg-slate-50 transition-all"
              >
                Tenho Carga
              </button>
            </div>
          </div>
        </HeroCarousel>
      </section>

      <div className="py-12 border-y border-border-dark bg-surface-dark">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col items-center gap-8">
          <p className="text-text-muted text-xs font-bold uppercase tracking-[0.2em]">Uma solução de confiança</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-60 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all">
              <span className="text-text-main text-2xl font-bold tracking-tighter">GRUPO ENER</span>
            </div>
            <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all">
              <span className="text-text-main text-2xl font-bold tracking-tighter">LOG-TECH</span>
            </div>
            <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all">
              <span className="text-text-main text-2xl font-bold tracking-tighter">AI-ROUTING</span>
            </div>
          </div>
        </div>
      </div>

      <section className="py-24 bg-white" id="motorista">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="mb-16">
            <h2 className="text-primary text-sm font-black uppercase tracking-widest mb-4">Para o Motorista</h2>
            <h3 className="text-text-main text-4xl md:text-5xl font-black tracking-tight mb-6">
              Ganhe mais, rode menos vazio
            </h3>
            <p className="text-text-muted text-lg max-w-2xl">
              Maximize seus lucros com fretes de retorno estratégicos e a segurança de uma plataforma operada pelo Grupo
              ENER.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group flex flex-col gap-6 rounded-2xl border border-border-dark bg-surface-dark p-8 hover:border-primary/50 transition-all">
              <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-3xl">trending_up</span>
              </div>
              <div>
                <h4 className="text-text-main text-xl font-bold mb-3">Mais Oportunidades</h4>
                <p className="text-text-muted leading-relaxed">
                  Acesse fretes diários de retorno em todo o Brasil, garantindo que você nunca volte com o baú vazio.
                </p>
              </div>
            </div>

            <div className="group flex flex-col gap-6 rounded-2xl border border-border-dark bg-surface-dark p-8 hover:border-primary/50 transition-all">
              <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-3xl">verified_user</span>
              </div>
              <div>
                <h4 className="text-text-main text-xl font-bold mb-3">Segurança Total</h4>
                <p className="text-text-muted leading-relaxed">
                  Operações monitoradas e pagamentos garantidos. Focamos no seu trajeto para você focar na estrada.
                </p>
              </div>
            </div>

            <div className="group flex flex-col gap-6 rounded-2xl border border-border-dark bg-surface-dark p-8 hover:border-primary/50 transition-all">
              <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-3xl">local_gas_station</span>
              </div>
              <div>
                <h4 className="text-text-main text-xl font-bold mb-3">Redução de Custos</h4>
                <p className="text-text-muted leading-relaxed">
                  Elimine a quilometragem ociosa e dilua seus custos fixos, aumentando drasticamente sua margem de lucro.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-surface-dark border-y border-border-dark" id="carga">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="text-primary text-sm font-black uppercase tracking-widest mb-4">Para o Dono de Máquina</h2>
              <h3 className="text-text-main text-4xl md:text-5xl font-black tracking-tight mb-8">
                Economize até 40% no transporte
              </h3>

              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="text-primary">
                    <span className="material-symbols-outlined text-3xl">payments</span>
                  </div>
                  <div>
                    <h4 className="text-text-main text-lg font-bold mb-1">Custo Altamente Reduzido</h4>
                    <p className="text-text-muted">
                      Ao utilizar caminhões que voltariam vazios, você acessa tarifas muito mais competitivas que o frete
                      convencional.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="text-primary">
                    <span className="material-symbols-outlined text-3xl">bolt</span>
                  </div>
                  <div>
                    <h4 className="text-text-main text-lg font-bold mb-1">Agilidade Instantânea</h4>
                    <p className="text-text-muted">
                      Nossa rede de motoristas em rota de retorno permite envios imediatos sem longas esperas por
                      cotações.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="text-primary">
                    <span className="material-symbols-outlined text-3xl">precision_manufacturing</span>
                  </div>
                  <div>
                    <h4 className="text-text-main text-lg font-bold mb-1">Especialistas em Carga Pesada</h4>
                    <p className="text-text-muted">
                      Plataforma dedicada ao transporte de máquinas e equipamentos de grande porte.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 w-full grid grid-cols-2 gap-4">
              <div
                className="bg-cover bg-center h-80 rounded-2xl border border-border-dark"
                style={{ backgroundImage: `url("${ABOUT_IMG_1}")` }}
              />
              <div
                className="bg-cover bg-center h-80 rounded-2xl border border-border-dark mt-8"
                style={{ backgroundImage: `url("${ABOUT_IMG_2}")` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white overflow-hidden" id="sobre">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="relative rounded-3xl bg-surface-dark border border-border-dark p-8 md:p-16 flex flex-col lg:flex-row gap-12 items-center">
            <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none">
              <svg className="w-full h-full text-primary fill-current" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  r="40"
                  stroke="currentColor"
                  strokeDasharray="2 2"
                  strokeWidth="0.5"
                />
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  r="30"
                  stroke="currentColor"
                  strokeDasharray="4 4"
                  strokeWidth="0.5"
                />
                <circle cx="50" cy="50" fill="none" r="20" stroke="currentColor" strokeWidth="0.5" />
              </svg>
            </div>

            <div className="lg:w-1/2">
              <h2 className="text-text-main text-3xl md:text-4xl font-black mb-6">Logística da era digital</h2>
              <p className="text-text-muted text-lg leading-relaxed mb-8">
                O Frete de Retorno não é apenas uma plataforma de anúncios; é um ecossistema inteligente que utiliza
                algoritmos avançados para prever rotas e conectar demandas em tempo real. Eliminamos o desperdício de
                combustível e de tempo, transformando quilômetros rodados em lucro líquido.
              </p>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="block text-primary text-4xl font-black mb-1">AI</span>
                  <span className="text-text-muted text-sm font-bold uppercase tracking-wider">Matching Inteligente</span>
                </div>
                <div>
                  <span className="block text-primary text-4xl font-black mb-1">24/7</span>
                  <span className="text-text-muted text-sm font-bold uppercase tracking-wider">Monitoramento</span>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full"></div>
                <span className="material-symbols-outlined text-[160px] text-primary relative z-10 opacity-90">
                  hub
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-surface-dark border-t border-border-dark pt-20 pb-10">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3 text-text-main">
                <img
                  src={BRAND_LOGO}
                  alt="Frete de Retorno"
                  className="h-8 w-8 rounded-lg object-contain"
                  loading="lazy"
                />
                <h2 className="text-lg font-black tracking-tighter uppercase">Frete de Retorno</h2>
              </div>

              <p className="text-text-muted text-sm leading-relaxed">
                Conectando a força do transporte pesado à inteligência da tecnologia moderna. Parte do Grupo ENER.
              </p>

              <div className="flex gap-4">
                <a
                  className="size-10 rounded-lg bg-white border border-border-dark flex items-center justify-center text-text-muted hover:text-primary hover:border-primary transition-all"
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noreferrer"
                  title="WhatsApp"
                >
                  <span className="material-symbols-outlined text-xl">chat</span>
                </a>
                <a
                  className="size-10 rounded-lg bg-white border border-border-dark flex items-center justify-center text-text-muted hover:text-primary hover:border-primary transition-all"
                  href={MAILTO_LINK}
                  title="Email"
                >
                  <span className="material-symbols-outlined text-xl">mail</span>
                </a>
              </div>
            </div>

            <div>
              <h5 className="text-text-main font-bold mb-6">Navegação</h5>
              <ul className="space-y-4">
                <li>
                  <a className="text-text-muted hover:text-primary text-sm transition-colors" href="#top">
                    Home
                  </a>
                </li>
                <li>
                  <a className="text-text-muted hover:text-primary text-sm transition-colors" href="#motorista">
                    Donos de Caminhões
                  </a>
                </li>
                <li>
                  <a className="text-text-muted hover:text-primary text-sm transition-colors" href="#carga">
                    Donos de Equipamentos
                  </a>
                </li>
                <li>
                  <a className="text-text-muted hover:text-primary text-sm transition-colors" href="#sobre">
                    Sobre Nós
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h5 className="text-text-main font-bold mb-6">Contato Comercial</h5>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-text-muted text-sm">
                  <span className="material-symbols-outlined text-primary text-base">person</span>
                  {CONTACT_NAME}
                </li>

                <li className="flex items-center gap-3 text-text-muted text-sm">
                  <span className="material-symbols-outlined text-primary text-base">phone</span>

                  <a
                    href={WHATSAPP_LINK}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-primary transition-colors"
                    title="Abrir WhatsApp"
                  >
                    {CONTACT_PHONE_DISPLAY}
                  </a>

                  <a href={TEL_LINK} className="ml-2 text-xs underline hover:text-text-main" title="Ligar">
                    Ligar
                  </a>
                </li>

                <li className="flex items-center gap-3 text-text-muted text-sm">
                  <span className="material-symbols-outlined text-primary text-base">mail</span>
                  <a href={MAILTO_LINK} className="hover:text-primary transition-colors">
                    {CONTACT_EMAIL}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h5 className="text-text-main font-bold mb-6">Sede Operacional</h5>
              <div className="flex gap-3 text-text-muted text-sm">
                <span className="material-symbols-outlined text-primary text-base">location_on</span>
                <a href={MAP_LINK} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                  {HQ_ADDRESS.split(' - ')[0]}
                  <br />
                  {HQ_ADDRESS.split(' - ').slice(1).join(' - ')}
                </a>
              </div>

              <div className="mt-6 w-full h-24 rounded-lg bg-white overflow-hidden border border-border-dark relative">
                <iframe
                  title="Mapa - Sede Operacional"
                  src={MAP_EMBED}
                  className="absolute inset-0 w-full h-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <a
                  href={MAP_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute inset-0"
                  aria-label="Abrir sede no Google Maps"
                  title="Abrir no Google Maps"
                />
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-border-dark flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-text-muted text-xs">
              © {year} Frete de Retorno by Grupo ENER. Todos os direitos reservados.
            </p>
            <div className="flex gap-6">
              <a className="text-text-muted hover:text-text-main text-xs" href="#">
                Política de Privacidade
              </a>
              <a className="text-text-muted hover:text-text-main text-xs" href="#">
                Termos de Uso
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
