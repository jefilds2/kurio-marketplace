import { createElement, Fragment, useState, useSyncExternalStore, type ReactNode } from 'react'
import { attributesToProps, type Element, htmlToDOM, type DOMNode } from 'html-react-parser'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { cache, carrinhoConsulta, trocarSessao } from '../app/consultas'
import { useSessao } from '../app/contexto'
import { mercadoApi, salvarToken } from '../integracoes/api'
import { Button, Janela } from './ui'
import { NavegacaoMobile } from './NavegacaoMobile'

type Documento = { classe?: string; nodes: DOMNode[] }
export type Alterar = (node: Element, props: Record<string, unknown>, filhos: () => ReactNode) => ReactNode | undefined

export function definirReferencia(nome: string, html: string) {
  let documento: Documento | undefined
  return {
    nome,
    documento() {
      if (documento) return documento
      const partes = /<body([^>]*)>([\s\S]*)<\/body>/i.exec(html)
      if (!partes) throw new Error('Corpo da referência ausente: ' + nome)
      documento = { classe: /class="([^"]*)"/.exec(partes[1])?.[1], nodes: htmlToDOM(partes[2]) }
      return documento
    },
  }
}
type Pagina = ReturnType<typeof definirReferencia>

const rotas: [RegExp, string][] = [
  [/^(?:\.\.\/|\.\/)?carrinho\/index\.html/, '/carrinho'],
  [/^(?:\.\.\/|\.\/)?pagamentos\/index\.html/, '/pagamento'],
  [/^(?:\.\.\/|\.\/)?login\/index\.html/, '/login'],
  [/^(?:\.\.\/|\.\/)?minha-conta\/index\.html/, '/conta/perfil'],
  [/^(?:\.\.\/|\.\/)?index\.html/, '/'],
]
function destinoLocal(href: string) {
  for (const [padrao, destino] of rotas) {
    if (padrao.test(href)) return destino + href.slice(href.indexOf('#') < 0 ? href.length : href.indexOf('#'))
  }
}
function imagemLocal(src: string) {
  return src.replace(/^.*\/src\/images\/(primeape[1-4])\.png$/, '/images/$1.webp')
}
function elemento(node: unknown): node is Element {
  return typeof node === 'object' && node !== null && 'name' in node && 'attribs' in node && 'children' in node
}
export function texto(node: Element): string {
  return node.children.map(child => child.type === 'text' ? child.data : elemento(child) ? texto(child) : '').join('').trim()
}
export function temClasse(node: Element, classe: string) {
  return (node.attribs.class ?? '').split(/\s+/).includes(classe)
}
export function ocultar(props: Record<string, unknown>, hidden: boolean) {
  return { hidden, className: (String(props.className ?? '').replace(/(?:^|\s)hidden(?=\s|$)/g, '') + (hidden ? ' hidden' : '')).trim() }
}
export function comProps(node: Element, props: Record<string, unknown>, filhos?: ReactNode) {
  const conteudo = filhos ?? renderizarNos(node.children as DOMNode[])
  return createElement(node.name, { ...atributos(node), ...props }, conteudo)
}
export function encontrar(node: Element, busca: (n: Element) => boolean): Element | undefined {
  if (busca(node)) return node
  for (const child of node.children) {
    if (elemento(child)) {
      const resultado = encontrar(child, busca)
      if (resultado) return resultado
    }
  }
}
export function modelo(pagina: Pagina, id: string) {
  const { nodes } = pagina.documento()
  for (const node of nodes) if (elemento(node)) {
    const resultado = encontrar(node, filho => filho.attribs.id === id)
    if (resultado) return resultado
  }
  throw new Error('Modelo visual ausente: ' + id)
}
const atributosPorNo = new WeakMap<Element, Record<string, unknown>>()
const textoRestrito = new Set(['tr', 'tbody', 'thead', 'tfoot', 'colgroup', 'table', 'head', 'html', 'frameset'])
const elementosInativos = new Set(['script', 'template', 'iframe'])

function atributos(node: Element) {
  const pronto = atributosPorNo.get(node)
  if (pronto) return pronto
  const props = attributesToProps(node.attribs, node.name) as Record<string, unknown>
  atributosPorNo.set(node, props)
  return props
}

export function renderizar(node: unknown, alterar: Alterar) {
  return elemento(node) ? renderizarNo(node, 0, alterar) : null
}

function renderizarNos(nodes: DOMNode[], alterar?: Alterar): ReactNode {
  const filhos = nodes.map((node, i) => renderizarNo(node, i, alterar))
  return filhos.length <= 1 ? filhos[0] : filhos
}

function renderizarNo(node: DOMNode, key: number, alterar?: Alterar): ReactNode {
  if (node.type === 'text') {
    if (!node.data.trim() && elemento(node.parent) && textoRestrito.has(node.parent.name)) return null
    return node.data
  }
  if (!elemento(node) || elementosInativos.has(node.name) || Object.keys(node.attribs).some(nome => nome.startsWith('on'))) return null

  const props = atributos(node)
  let conteudo: ReactNode
  let avaliados = false
  const filhos = () => {
    if (!avaliados) {
      conteudo = renderizarNos(node.children as DOMNode[], alterar)
      avaliados = true
    }
    return conteudo
  }
  const resultado = alterar?.(node, props, filhos)
  if (resultado !== undefined) return <Fragment key={key}>{resultado}</Fragment>
  if (node.name === 'img' && node.attribs.src) {
    return createElement(node.name, { ...props, key, src: imagemLocal(node.attribs.src) })
  }
  if (node.name === 'a' && node.attribs.href) {
    const href = destinoLocal(node.attribs.href)
    if (href) return <Link key={key} {...props} to={href as '/'}>{filhos()}</Link>
    if (node.attribs.href === '#') return <span key={key} className={String(props.className ?? '')}>{filhos()}</span>
  }
  if (node.name === 'textarea' && node.children[0]?.type === 'text') {
    return createElement(node.name, { ...props, key, defaultValue: node.children[0].data })
  }
  return createElement(node.name, { ...props, key }, filhos())
}

const viewportMobile = '(max-width: 600px)'
const layoutMobile = () => matchMedia(viewportMobile).matches
function observarLayout(notificar: () => void) {
  const viewport = matchMedia(viewportMobile)
  viewport.addEventListener('change', notificar)
  return () => viewport.removeEventListener('change', notificar)
}
const cabecalhoERodapeOcultos = new Set(['inicio', 'mercado', 'carrinho', 'pagamentos'])

export function Referencia({ pagina, alterar, extras, busca }: {
  pagina: Pagina; alterar: Alterar; extras?: ReactNode; busca?: { valor: string; mudar: (valor: string) => void }
}) {
  const mobile = useSyncExternalStore(observarLayout, layoutMobile)
  const [menu, setMenu] = useState(false)
  const [pesquisa, setPesquisa] = useState(false)
  const [buscaLocal, setBuscaLocal] = useState('')
  const { sessao, avisar } = useSessao()
  const pathname = useRouterState({ select: s => s.location.pathname })
  const navigate = useNavigate()
  const ocultarEstrutura = mobile && cabecalhoERodapeOcultos.has(pagina.nome)
  const mostraCarrinho = pagina.nome === 'inicio' || (!ocultarEstrutura && pagina.nome !== 'login')
  const dados = useQuery({ ...carrinhoConsulta(sessao?.perfil.id ?? 'visitante'), enabled: mostraCarrinho })
  const qtd = dados.data?.linhas.reduce((soma, item) => soma + item.quantidade, 0) ?? 0
  const sair = useMutation({ mutationFn: mercadoApi.logout, onSuccess: async () => {
    salvarToken('')
    cache.setQueryData(['sessao'], null)
    await trocarSessao()
    avisar('Sessão encerrada.')
    await navigate({ to: '/' })
  } })
  const abrirCarrinho = () => void navigate({ to: '/carrinho' })
  const abrirConta = () => void navigate({ to: sessao ? '/conta/perfil' : '/login' })
  const navegador: Alterar = (node, props, filhos) => {
    if (ocultarEstrutura && (temClasse(node, 'cabecalho') || temClasse(node, 'rodape-kurio') || node.attribs.id === 'menu-mobile')) {
      return null
    }
    const modificado = alterar(node, props, filhos)
    if (modificado !== undefined) return modificado
    const id = node.attribs.id
    if (id === 'botao-menu-mobile' || id === 'conta-botao-menu') {
      return comProps(node, { onClick: () => setMenu(!menu), 'aria-expanded': menu }, filhos())
    }
    if (id === 'menu-mobile' || id === 'conta-menu-mobile') {
      return comProps(node, { ...ocultar(props, !menu), className: String(ocultar(props, !menu).className) + (menu ? ' flex' : '') },
        <>{filhos()}<Link onClick={() => setMenu(false)} to="/favoritos">Favoritos</Link>
          {sessao && <button type="button" onClick={() => sair.mutate()}>Sair da conta</button>}</>)
    }
    if (id === 'quantidade-carrinho' || id === 'conta-contador-carrinho') return comProps(node, {}, qtd)
    if (id === 'abrir-carrinho' || id === 'conta-abrir-carrinho') return comProps(node, {
      href: node.name === 'a' ? '/carrinho' : undefined, 'aria-label': `Carrinho com ${qtd} itens`,
      onClick: (e: React.MouseEvent) => { e.preventDefault(); abrirCarrinho() },
    }, filhos())
    if (node.name === 'button' && (temClasse(node, 'botao-entrar') || id === 'conta-abrir-login')) {
      return comProps(node, { onClick: abrirConta }, sessao ? 'Minha conta' : filhos())
    }
    if (node.name === 'a' && node.attribs.href === '#' && texto(node) === 'Minha coleção') {
      return <Link {...props} to="/favoritos">{filhos()}</Link>
    }
    if (node.name === 'button' && node.attribs['aria-label'] === 'Buscar') {
      return comProps(node, { onClick: () => setPesquisa(true) }, filhos())
    }
    if (node.name === 'button' && ['Sair', 'Sair da conta'].includes(texto(node))) {
      return comProps(node, { onClick: () => sair.mutate(), disabled: sair.isPending }, filhos())
    }
    if (node.name === 'a' && /#(inicio|mercado|criadores|aprenda)$/.test(node.attribs.href ?? '')) {
      const href = '/' + node.attribs.href.slice(node.attribs.href.indexOf('#'))
      return <Link {...props} to={href as '/'} onClick={() => setMenu(false)}>{filhos()}</Link>
    }
    return undefined
  }
  const { classe, nodes } = pagina.documento()
  return <div className={`design-kurio design-${pagina.nome} ${classe ?? ''}`}>
    <a className="pular" href="#conteudo" onClick={() => document.getElementById('conteudo')?.focus()}>Ir para o conteúdo</a>
    {renderizarNos(nodes, (node, props, filhos) => {
      if (node.name === 'main' && node.attribs.id !== 'inicio') return navegarMain(node, filhos, navegador(node, props, filhos))
      const resultado = navegador(node, props, filhos)
      if (node.name === 'main' && node.attribs.id === 'inicio') return navegarMain(node, filhos, resultado)
      return resultado
    })}
    {extras}
    {mobile && pagina.nome === 'inicio' && <NavegacaoMobile quantidade={qtd} autenticado={!!sessao} />}
    <Janela titulo="Buscar NFTs" descricao="Explore coleções no catálogo da KURIO." aberta={pesquisa} aoMudar={setPesquisa}>
      <form className="flex flex-col gap-3" onSubmit={e => {
        e.preventDefault()
        if (busca) busca.mudar(buscaLocal)
        else void navigate({ to: '/', search: { busca: buscaLocal } })
        setPesquisa(false)
      }}>
        <input className="entrada" aria-label="Explorar coleções" placeholder="Explorar coleções"
          value={pesquisa ? buscaLocal : busca?.valor ?? ''} onChange={e => setBuscaLocal(e.target.value)} autoComplete="off" />
        <Button type="submit">Buscar</Button>
      </form>
    </Janela>
    {pathname === '/conta/perfil' && sessao && <div className="mx-auto max-w-[1200px] px-8 pb-6">
      <Button variant="outline" onClick={() => sair.mutate()} disabled={sair.isPending}>Sair da conta</Button>
    </div>}
  </div>
}
function navegarMain(node: Element, filhos: () => ReactNode, resultado: ReactNode) {
  return <Fragment><span id="conteudo" tabIndex={-1} />{resultado ?? comProps(node, {}, filhos())}</Fragment>
}
