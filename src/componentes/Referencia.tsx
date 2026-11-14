import { cloneElement, createElement, Fragment, isValidElement, useState, type ReactNode } from 'react'
import { attributesToProps, domToReact, type Element, htmlToDOM, type DOMNode, type HTMLReactParserOptions } from 'html-react-parser'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { cache, carrinhoConsulta, trocarSessao } from '../app/consultas'
import { useSessao } from '../app/contexto'
import { mercadoApi, salvarToken } from '../integracoes/api'
import { Button, Janela } from './ui'
import { NavegacaoMobile } from './NavegacaoMobile'
import inicio from '../referencias/inicio.html?raw'
import mercado from '../referencias/mercado.html?raw'
import carrinho from '../referencias/carrinho.html?raw'
import pagamentos from '../referencias/pagamentos.html?raw'
import login from '../referencias/login.html?raw'
import conta from '../referencias/minha-conta.html?raw'
import confirmacao from '../referencias/confirmacao-pedido.html?raw'

const paginas = { inicio, mercado, carrinho, pagamentos, login, conta, confirmacao }
type Pagina = keyof typeof paginas
export type Alterar = (node: Element, props: Record<string, unknown>, filhos: () => ReactNode) => ReactNode | undefined
const documentos = new Map<Pagina, { classe?: string; nodes: DOMNode[] }>()
function documento(pagina: Pagina) {
  const pronto = documentos.get(pagina)
  if (pronto) return pronto
  const partes = /<body([^>]*)>([\s\S]*)<\/body>/i.exec(paginas[pagina])
  if (!partes) throw new Error('Corpo da referência ausente: ' + pagina)
  const novo = { classe: /class="([^"]*)"/.exec(partes[1])?.[1], nodes: htmlToDOM(partes[2]) }
  documentos.set(pagina, novo)
  return novo
}
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
  const atributos = attributesToProps(node.attribs, node.name)
  const conteudo = filhos ?? (node.children.length ? domToReact(node.children as DOMNode[]) : undefined)
  return createElement(node.name, { ...atributos, ...props }, conteudo)
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
  const { nodes } = documento(pagina)
  for (const node of nodes) if (elemento(node)) {
    const resultado = encontrar(node, filho => filho.attribs.id === id)
    if (resultado) return resultado
  }
  throw new Error('Modelo visual ausente: ' + id)
}
export function renderizar(node: unknown, alterar: Alterar) {
  return elemento(node) ? domToReact([node], opcoes(alterar)) : null
}
function opcoes(alterar: Alterar): HTMLReactParserOptions {
  const options: HTMLReactParserOptions = {
    replace(node) {
      if (!elemento(node)) return
      if (['script', 'template', 'iframe'].includes(node.name)) return <></>
      if (Object.keys(node.attribs).some(nome => nome.startsWith('on'))) return <></>
      return undefined
    },
    transform(reactNode, node) {
      if (!elemento(node) || !isValidElement<Record<string, unknown>>(reactNode)) return typeof reactNode === 'string' ? reactNode : <>{reactNode}</>
      if (['script', 'template', 'iframe'].includes(node.name)) return reactNode
      const props = attributesToProps(node.attribs, node.name) as Record<string, unknown>
      const filhos = () => (reactNode.props as { children?: ReactNode }).children
      const modificado = alterar(node, props, filhos)
      if (modificado !== undefined) return <Fragment key={reactNode.key}>{modificado}</Fragment>
      if (node.name === 'img' && node.attribs.src) return cloneElement(reactNode, { src: imagemLocal(node.attribs.src) })
      if (node.name === 'a' && node.attribs.href) {
        const href = destinoLocal(node.attribs.href)
        if (href) return <Link {...props} to={href as '/'}>{filhos()}</Link>
        if (node.attribs.href === '#') return <span className={String(props.className ?? '')}>{filhos()}</span>
      }
      return reactNode
    },
  }
  return options
}

export function Referencia({ pagina, alterar, extras, busca }: {
  pagina: Pagina; alterar: Alterar; extras?: ReactNode; busca?: { valor: string; mudar: (valor: string) => void }
}) {
  const [menu, setMenu] = useState(false)
  const [pesquisa, setPesquisa] = useState(false)
  const [buscaLocal, setBuscaLocal] = useState('')
  const { sessao, avisar } = useSessao()
  const pathname = useRouterState({ select: s => s.location.pathname })
  const navigate = useNavigate()
  const dados = useQuery(carrinhoConsulta(sessao?.perfil.id ?? 'visitante'))
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
  return <div className={`design-kurio design-${pagina} ${documento(pagina).classe ?? ''}`}>
    <a className="pular" href="#conteudo" onClick={() => document.getElementById('conteudo')?.focus()}>Ir para o conteúdo</a>
    {domToReact(documento(pagina).nodes, opcoes((node, props, filhos) => {
      if (node.name === 'main' && node.attribs.id !== 'inicio') return navegarMain(node, filhos, navegador(node, props, filhos))
      const resultado = navegador(node, props, filhos)
      if (node.name === 'main' && node.attribs.id === 'inicio') return navegarMain(node, filhos, resultado)
      return resultado
    }))}
    {extras}
    {pagina === "inicio" && <NavegacaoMobile quantidade={qtd} autenticado={!!sessao} />}
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
