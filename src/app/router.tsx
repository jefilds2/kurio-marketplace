import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createRootRoute, createRoute, createRouter, HeadContent, Link, Outlet, redirect, useNavigate, useRouter } from '@tanstack/react-router'
import { cache, sessaoConsulta, trocarSessao } from './consultas'
import { SessaoContexto } from './contexto'
import { Button, Erro, Skeleton } from '../componentes/ui'
import { tokenAtual } from '../integracoes/api'
import { buscaCatalogo } from '../contratos/mercado'
import { useTempoReal } from '../integracoes/tempo-real'
import { PaginaCatalogoVisual } from '../modulos/catalogo/CatalogoVisual'
import { nftConsulta } from '../modulos/nft/Detalhe'
import { DetalheVisual } from '../modulos/nft/DetalheVisual'
import { Demonstracao } from './Demonstracao'

const Carrinho = lazy(() => import('../modulos/carrinho/CarrinhoVisual').then(m => ({ default: m.CarrinhoVisual })))
const Autenticacao = lazy(() => import('../modulos/conta/AutenticacaoVisual').then(m => ({ default: m.AutenticacaoVisual })))
const Conta = lazy(() => import('../modulos/conta/ContaVisual').then(m => ({ default: m.ContaVisual })))
const Pagamento = lazy(() => import('../modulos/pedidos/PagamentoVisual').then(m => ({ default: m.PagamentoVisual })))
const Pedido = lazy(() => import('../modulos/pedidos/PedidoVisual').then(m => ({ default: m.PedidoVisual })))

function Aplicacao() {
  const consulta = useQuery(sessaoConsulta)
  const sessao = consulta.data ?? null
  const [aviso, setAviso] = useState('')
  const avisar = useCallback((mensagem: string) => setAviso(mensagem), [])
  const contexto = useMemo(() => ({ sessao, avisar }), [sessao, avisar])
  const router = useRouter()
  useTempoReal(sessao?.token ?? '', sessao?.perfil.id ?? '', avisar)
  useEffect(() => {
    const tratar = () => {
      cache.setQueryData(['sessao'], null)
      void trocarSessao()
      avisar('Sua sessão terminou. Entre novamente para continuar.')
      void router.invalidate()
    }
    window.addEventListener('kurio:expirou', tratar)
    return () => window.removeEventListener('kurio:expirou', tratar)
  }, [avisar, router])
  useEffect(() => {
    if (!aviso) return
    const timer = window.setTimeout(() => setAviso(''), 6500)
    return () => window.clearTimeout(timer)
  }, [aviso])
  return <SessaoContexto.Provider value={contexto}>
    <HeadContent />
    <Suspense fallback={<Skeleton className="h-80" />}><Outlet /></Suspense>
    <div className="aviso-flutuante" role="status" aria-live="polite">{aviso}</div>
    <Demonstracao />
  </SessaoContexto.Provider>
}
function NaoEncontrado() {
  return <section className="estado-vazio"><h1>Página não encontrada</h1><Button asChild><Link to="/">Voltar ao início</Link></Button></section>
}
async function exigirSessao({ location }: { location: { href: string } }) {
  let sessao
  try { sessao = await cache.fetchQuery({ ...sessaoConsulta, staleTime: 0 }) } catch { sessao = null }
  if (!sessao || sessao.token !== tokenAtual()) throw redirect({ to: '/login', search: { retorno: location.href }, replace: true })
}
const metadados = (title: string, description: string, privado = false) => ({
  meta: [{ title }, { name: 'description', content: description }, ...(privado ? [{ name: 'robots', content: 'noindex, nofollow' }] : [])],
})
const raiz = createRootRoute({ component: Aplicacao, notFoundComponent: NaoEncontrado,
  errorComponent: ({ error, reset }) => <section className="estado-vazio"><h1>Não foi possível abrir a página</h1><Erro erro={error} tentar={reset} /><Link to="/">Voltar ao início</Link></section> })
const inicio = createRoute({
  getParentRoute: () => raiz, path: '/', validateSearch: (search: Partial<ReturnType<typeof buscaCatalogo.parse>> & import('@tanstack/react-router').SearchSchemaInput) => buscaCatalogo.parse(search),
  head: () => metadados('KURIO — Marketplace de NFTs', 'Descubra coleções de arte digital e NFTs no marketplace KURIO.'),
  component: Inicio,
})
const inicioAntigo = createRoute({
  getParentRoute: () => raiz, path: '/index.html',
  validateSearch: (search: Record<string, unknown>) => buscaCatalogo.parse(search),
  beforeLoad: ({ location, search }) => {
    throw redirect({ to: '/', search, hash: location.hash, replace: true })
  },
})
function Inicio() {
  const filtros = inicio.useSearch()
  const navigate = useNavigate({ from: '/' })
  return <PaginaCatalogoVisual filtros={filtros} navegar={mudanca => void navigate({ search: anterior => ({ ...anterior, ...mudanca }), resetScroll: false })} />
}
const detalhe = createRoute({
  getParentRoute: () => raiz, path: '/nfts/$nftId',
  loader: ({ params }) => cache.ensureQueryData(nftConsulta(params.nftId)).catch(() => null),
  head: ({ loaderData }) => metadados(loaderData ? `${loaderData.nome} — KURIO` : 'Detalhes do NFT — KURIO',
    loaderData?.descricao ?? 'Confira detalhes e edições dos NFTs do marketplace KURIO.'),
  component: () => <DetalheVisual id={detalhe.useParams().nftId} />,
})
const carrinho = createRoute({ getParentRoute: () => raiz, path: '/carrinho', component: Carrinho,
  head: () => metadados('Carrinho de NFTs — KURIO', 'Confira seus itens e a cotação simulada.', true) })
function validarRetorno(search: Record<string, unknown>) {
  const retorno = search.retorno
  return { retorno: typeof retorno === 'string' && /^\/(?![/\\])/.test(retorno) ? retorno : undefined } as { retorno?: string }
}
const login = createRoute({ getParentRoute: () => raiz, path: '/login', validateSearch: validarRetorno,
  head: () => metadados('Entrar — KURIO', 'Acesse sua conta de colecionador.', true),
  component: () => <Autenticacao key="login" acao="login" retorno={login.useSearch().retorno ?? '/'} /> })
const cadastro = createRoute({ getParentRoute: () => raiz, path: '/cadastro', validateSearch: validarRetorno,
  head: () => metadados('Criar conta — KURIO', 'Crie seu perfil de colecionador.', true),
  component: () => <Autenticacao key="cadastro" acao="cadastro" retorno={cadastro.useSearch().retorno ?? '/'} /> })
const perfil = createRoute({ getParentRoute: () => raiz, path: '/conta/perfil', beforeLoad: exigirSessao,
  head: () => metadados('Meu perfil — KURIO', 'Atualize seu perfil e suas credenciais.', true), component: () => <Conta /> })
const carteiras = createRoute({ getParentRoute: () => raiz, path: '/conta/carteiras', beforeLoad: exigirSessao,
  head: () => metadados('Carteiras — KURIO', 'Gerencie suas carteiras simuladas.', true), component: () => <Conta secao="carteiras" /> })
const favoritos = createRoute({ getParentRoute: () => raiz, path: '/favoritos', beforeLoad: exigirSessao,
  head: () => metadados('Favoritos — KURIO', 'Consulte seus NFTs favoritos.', true), component: () => <Conta secao="favoritos" /> })
const pagamento = createRoute({ getParentRoute: () => raiz, path: '/pagamento', beforeLoad: exigirSessao,
  head: () => metadados('Pagamento — KURIO', 'Revise a compra simulada e a carteira selecionada.', true), component: Pagamento })
const pedido = createRoute({ getParentRoute: () => raiz, path: '/pedidos/$pedidoId', beforeLoad: exigirSessao,
  head: () => metadados('Pedido — KURIO', 'Acompanhe o estado ou consulte o recibo.', true),
  component: () => <Pedido id={pedido.useParams().pedidoId} /> })

export const router = createRouter({
  routeTree: raiz.addChildren([inicio, inicioAntigo, detalhe, carrinho, login, cadastro, perfil, carteiras, favoritos, pagamento, pedido]),
  scrollRestoration: true,
  defaultPendingComponent: () => <Skeleton className="mx-auto my-8 h-80 max-w-5xl" />,
})
declare module '@tanstack/react-router' { interface Register { router: typeof router } }
