import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'

export default function Home() {
  const nav = useNavigate()
  const { profile } = useAuth()

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
    // leva para cadastro já “apontando” motorista
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
    // leva para cadastro já “apontando” dono de máquina/empresa
    nav('/auth/register?role=SHIPPER')
  }

  return (
    <div className="bg-white text-text-main font-display">
      <header className="sticky top-0 z-50 w-full border-b border-solid border-border-dark bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-text-main">
            <div className="text-primary">
              <svg className="size-8" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M39.5563 34.1455V13.8546C39.5563 15.708 36.8773 17.3437 32.7927 18.3189C30.2914 18.916 27.263 19.2655 24 19.2655C20.737 19.2655 17.7086 18.916 15.2073 18.3189C11.1227 17.3437 8.44365 15.708 8.44365 13.8546V34.1455C8.44365 35.9988 11.1227 37.6346 15.2073 38.6098C17.7086 39.2069 20.737 39.5564 24 39.5564C27.263 39.5564 30.2914 39.2069 32.7927 38.6098C36.8773 37.6346 39.5563 35.9988 39.5563 34.1455Z"
                  fill="currentColor"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M10.4485 13.8519C10.4749 13.9271 10.6203 14.246 11.379 14.7361C12.298 15.3298 13.7492 15.9145 15.6717 16.3735C18.0007 16.9296 20.8712 17.2655 24 17.2655C27.1288 17.2655 29.9993 16.9296 32.3283 16.3735C34.2508 15.9145 35.702 15.3298 36.621 14.7361C37.3796 14.246 37.5251 13.9271 37.5515 13.8519C37.5287 13.7876 37.4333 13.5973 37.0635 13.2931C36.5266 12.8516 35.6288 12.3647 34.343 11.9175C31.79 11.0295 28.1333 10.4437 24 10.4437C19.8667 10.4437 16.2099 11.0295 13.657 11.9175C12.3712 12.3647 11.4734 12.8516 10.9365 13.2931C10.5667 13.5973 10.4713 13.7876 10.4485 13.8519ZM37.5563 18.7877C36.3176 19.3925 34.8502 19.8839 33.2571 20.2642C30.5836 20.9025 27.3973 21.2655 24 21.2655C20.6027 21.2655 17.4164 20.9025 14.7429 20.2642C13.1498 19.8839 11.6824 19.3925 10.4436 18.7877V34.1275C10.4515 34.1545 10.5427 34.4867 11.379 35.027C12.298 35.6207 13.7492 36.2054 15.6717 36.6644C18.0007 37.2205 20.8712 37.5564 24 37.5564C27.1288 37.5564 29.9993 37.2205 32.3283 36.6644C34.2508 36.2054 35.702 35.6207 36.621 35.027C37.4573 34.4867 37.5485 34.1546 37.5563 34.1275V18.7877ZM41.5563 13.8546V34.1455C41.5563 36.1078 40.158 37.5042 38.7915 38.3869C37.3498 39.3182 35.4192 40.0389 33.2571 40.5551C30.5836 41.1934 27.3973 41.5564 24 41.5564C20.6027 41.5564 17.4164 41.1934 14.7429 40.5551C12.5808 40.0389 10.6502 39.3182 9.20848 38.3869C7.84205 37.5042 6.44365 36.1078 6.44365 34.1455L6.44365 13.8546C6.44365 12.2684 7.37223 11.0454 8.39581 10.2036C9.43325 9.3505 10.8137 8.67141 12.343 8.13948C15.4203 7.06909 19.5418 6.44366 24 6.44366C28.4582 6.44366 32.5797 7.06909 35.657 8.13948C37.1863 8.67141 38.5667 9.3505 39.6042 10.2036C40.6278 11.0454 41.5563 12.2684 41.5563 13.8546Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <h2 className="text-xl font-black tracking-tighter uppercase">Frete de Retorno</h2>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a className="text-text-main text-sm font-semibold hover:text-primary transition-colors" href="#">
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

      <section className="relative">
        <div
          className="w-full min-h-[700px] flex items-center justify-center bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.6) 100%), url("https://lh3.googleusercontent.com/aida-public/AB6AXuDALdWL7Xqfz7WRWQL2bK4AzexOGlJWFs5aDi0fzyVLWu8mGcbsWJXYr1gErUcpA7rNtkxsV8jAU9LJTGIWonQQ94j2Z_5rNWJbyB8FJQyuUnFInP3VjiPGthKhdCZG1E2osrGZUMQrMi6unc9PrNEeioytjTGokh8Y_x_WQIbViok1F7E3xZ_w7mOfHSnSLAbewxCpRmDQdd1iGV0u9cwwUXB444oiaRVGtc4v7bBBxYBS2CL1kgQmM5UwjMnAwAL2BJy5CpOP53bo")',
          }}
        >
          <div className="max-w-[960px] px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-red/10 border border-accent-red/20 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-red opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-red"></span>
              </span>
              <span className="text-accent-red text-xs font-bold uppercase tracking-widest">
                Tecnologia Grupo ENER
              </span>
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
        </div>
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
                      Ao utilizar caminhões que voltariam vazios, você acessa tarifas muito mais competitivas que o frete convencional.
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
                      Nossa rede de motoristas em rota de retorno permite envios imediatos sem longas esperas por cotações.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="text-primary">
                    <span className="material-symbols-outlined text-3xl">precision_manufacturing</span>
                  </div>
                  <div>
                    <h4 className="text-text-main text-lg font-bold mb-1">Especialistas em Carga Pesada</h4>
                    <p className="text-text-muted">Plataforma dedicada ao transporte de máquinas e equipamentos de grande porte.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 w-full grid grid-cols-2 gap-4">
              <div
                className="bg-cover bg-center h-80 rounded-2xl border border-border-dark"
                style={{
                  backgroundImage:
                    'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAzP6NDIsbdNJNoFsUknCcP3Y1FLzOOVi5fMeExfUjKPq89wzloxBOzkmi5-ljJhP8Su637DkQiQMS1cM4dhXALlh-PuHE1AvC57PYlMNNLg60DnuWN6FEhP9v8Vt8Uzkdk0AlSuTZ1UJYe-wgfdQvXCPj4lokJ7HYXlh6nXhhb32cKxInQJXmgFU_wnqXNzksV2hEorrUI6ulsknCGBZFywgfsFK9f6tCsh4y11KVqZYT1T6oV7M0bXG6rXjvMFOT1W3hrrIPjTMNf")',
                }}
              />
              <div
                className="bg-cover bg-center h-80 rounded-2xl border border-border-dark mt-8"
                style={{
                  backgroundImage:
                    'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDggyuGbHjLTAbcQXFmQMPcomyu5s9LncmeNRUEnb0AQ29BfFfTyP8EO0Zwhz_g7QXgpgq5sT3DsbgHyEJNQG97SDi1Uu-soTwYVja9ww14Xzym42aaNfpD1xlUK3bAg0fiB3JV7pr3WzoHnJwifG4HzOfe5LlwnEh_eyzuHcLHYgJm127HSEc1oNfeTfN2MemhVHN_pH5_YBNPKfZAt5GwwoNhDwNbXkKKqNc0gKXjBA4u6yG0rO_OF4HxwuVpVQ50DnFrBfpPXuyX")',
                }}
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
                <circle cx="50" cy="50" fill="none" r="40" stroke="currentColor" strokeDasharray="2 2" strokeWidth="0.5" />
                <circle cx="50" cy="50" fill="none" r="30" stroke="currentColor" strokeDasharray="4 4" strokeWidth="0.5" />
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
                <span className="material-symbols-outlined text-[160px] text-primary relative z-10 opacity-90">hub</span>
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
                <div className="text-primary">
                  <svg className="size-6" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M39.5563 34.1455V13.8546C39.5563 15.708 36.8773 17.3437 32.7927 18.3189C30.2914 18.916 27.263 19.2655 24 19.2655C20.737 19.2655 17.7086 18.916 15.2073 18.3189C11.1227 17.3437 8.44365 15.708 8.44365 13.8546V34.1455C8.44365 35.9988 11.1227 37.6346 15.2073 38.6098C17.7086 39.2069 20.737 39.5564 24 39.5564C27.263 39.5564 30.2914 39.2069 32.7927 38.6098C36.8773 37.6346 39.5563 35.9988 39.5563 34.1455Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-black tracking-tighter uppercase">Frete de Retorno</h2>
              </div>

              <p className="text-text-muted text-sm leading-relaxed">
                Conectando a força do transporte pesado à inteligência da tecnologia moderna. Parte do Grupo ENER.
              </p>

              <div className="flex gap-4">
                <a
                  className="size-10 rounded-lg bg-white border border-border-dark flex items-center justify-center text-text-muted hover:text-primary hover:border-primary transition-all"
                  href="#"
                >
                  <span className="material-symbols-outlined text-xl">share</span>
                </a>
                <a
                  className="size-10 rounded-lg bg-white border border-border-dark flex items-center justify-center text-text-muted hover:text-primary hover:border-primary transition-all"
                  href="#"
                >
                  <span className="material-symbols-outlined text-xl">camera</span>
                </a>
              </div>
            </div>

            <div>
              <h5 className="text-text-main font-bold mb-6">Navegação</h5>
              <ul className="space-y-4">
                <li><a className="text-text-muted hover:text-primary text-sm transition-colors" href="#">Home</a></li>
                <li><a className="text-text-muted hover:text-primary text-sm transition-colors" href="#motorista">Donos de Caminhões</a></li>
                <li><a className="text-text-muted hover:text-primary text-sm transition-colors" href="#carga">Donos de Equipamentos</a></li>
                <li><a className="text-text-muted hover:text-primary text-sm transition-colors" href="#sobre">Sobre Nós</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-text-main font-bold mb-6">Contato Comercial</h5>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-text-muted text-sm">
                  <span className="material-symbols-outlined text-primary text-base">person</span>
                  Entony Santos
                </li>
                <li className="flex items-center gap-3 text-text-muted text-sm">
                  <span className="material-symbols-outlined text-primary text-base">phone</span>
                  +55 (62) 9999-9999
                </li>
                <li className="flex items-center gap-3 text-text-muted text-sm">
                  <span className="material-symbols-outlined text-primary text-base">mail</span>
                  contato@fretederetorno.com.br
                </li>
              </ul>
            </div>

            <div>
              <h5 className="text-text-main font-bold mb-6">Sede Operacional</h5>
              <div className="flex gap-3 text-text-muted text-sm">
                <span className="material-symbols-outlined text-primary text-base">location_on</span>
                <p>Avenida Logística, 1234<br />Goiânia - GO, 74000-000</p>
              </div>

              <div className="mt-6 w-full h-24 rounded-lg bg-white overflow-hidden border border-border-dark">
                <div className="w-full h-full bg-slate-50">
                  <div className="w-full h-full flex items-center justify-center opacity-10">
                    <span className="material-symbols-outlined text-4xl text-text-main">map</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-border-dark flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-text-muted text-xs">© 2024 Frete de Retorno by Grupo ENER. Todos os direitos reservados.</p>
            <div className="flex gap-6">
              <a className="text-text-muted hover:text-text-main text-xs" href="#">Política de Privacidade</a>
              <a className="text-text-muted hover:text-text-main text-xs" href="#">Termos de Uso</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
