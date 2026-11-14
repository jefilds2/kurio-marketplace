import { useState } from 'react'
import { ChevronLeft, Heart, ShoppingCart } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { comProps, temClasse, ocultar, Referencia, type Alterar } from '../../componentes/Referencia'
import { Erro, Janela, Skeleton } from '../../componentes/ui'
import { exibirEth, type Nft } from '../../contratos/mercado'
import { useSessao } from '../../app/contexto'
import { mercadoApi } from '../../integracoes/api'
import { useCarrinhoMutation } from '../carrinho/estado'
import { CartaoVisual } from '../catalogo/CatalogoVisual'
import { useFavorito } from './Favoritar'
import { nftConsulta } from './Detalhe'

export function DetalheVisual({ id }: { id: string }) {
  const consulta = useQuery(nftConsulta(id))
  if (consulta.isPending) return <div className="mx-auto max-w-[1200px] px-8"><Skeleton className="my-8 h-80" /></div>
  if (!consulta.data) return <main className="mx-auto max-w-[1200px] px-8"><h1>NFT não encontrado</h1><Erro erro={consulta.error} tentar={() => void consulta.refetch()} /></main>
  return <Ficha key={id} nft={consulta.data} />
}
function Ficha({ nft }: { nft: Nft }) {
  const [imagem, setImagem] = useState(0)
  const [edicaoId, setEdicao] = useState(nft.edicoes[0].id)
  const [qtd, setQtd] = useState(1)
  const [zoom, setZoom] = useState(false)
  const [avaliacoes, setAvaliacoes] = useState(false)
  const { sessao, avisar } = useSessao()
  const navigate = useNavigate()
  const mutation = useCarrinhoMutation()
  const favorito = useFavorito(nft.id)
  const edicao = nft.edicoes.find(item => item.id === edicaoId) ?? nft.edicoes[0]
  const quantidade = Math.max(1, Math.min(qtd, edicao.estoque))
  const relacionados = useQuery({ queryKey: ['catalogo', 'relacionados'], queryFn: ({ signal }) =>
    mercadoApi.catalogo({ busca: '', categorias: [], redes: [], minimo: '', maximo: '', vitrine: 'todos', ordem: 'recentes', pagina: 1 }, signal) })
  async function adicionar(comprar: boolean) {
    if (!edicao.estoque) return
    try {
      await mutation.mutateAsync({ acao: 'adicionar', item: { nftId: nft.id, edicaoId, quantidade } })
      avisar('NFT adicionado ao carrinho.')
      if (comprar) await (sessao ? navigate({ to: '/pagamento' }) : navigate({ to: '/login', search: { retorno: '/pagamento' } }))
    } catch { /* Erro exibido na ficha. */ }
  }
  const visual: Alterar = (node, props, filhos) => {
    const id = node.attribs.id
    const dados: Record<string, string | number> = {
      'mercado-titulo-nft': nft.nome, 'mercado-preco-nft': exibirEth(edicao.preco),
      'mercado-resumo-descricao': nft.descricao, 'mercado-descricao-longa': nft.descricao,
      'mercado-token': nft.token, 'mercado-colecao': nft.colecao, 'mercado-atributos': nft.atributos.join(', '),
      'mercado-quantidade': quantidade, 'mercado-texto-favorito': favorito.ativo ? 'Favoritado' : 'Favoritar',
    }
    if (id === 'mercado-preco-nft') return comProps(node, { className: props.className + ' detalhe-desktop-preco' }, exibirEth(edicao.preco))
    if (id && Object.hasOwn(dados, id)) return comProps(node, {}, dados[id])
    if (id === 'mercado-imagem-principal') return <button type="button" aria-label="Ampliar imagem e abrir galeria" className="arte-referencia"
      onClick={() => setZoom(true)}>{comProps(node, { src: nft.imagens[imagem], alt: nft.nome, fetchPriority: 'high' })}</button>
    if (node.attribs['data-miniatura'] !== undefined) {
      const indice = Number(node.attribs['data-miniatura'])
      const classe = String(props.className).replace(/border-(kurio-destaque|transparent)/g, '')
      return comProps(node, { className: classe + (indice === imagem ? ' border-kurio-destaque' : ' border-transparent'),
        'aria-pressed': indice === imagem, onClick: () => setImagem(indice) },
        <img className="h-full w-full object-cover" src={nft.imagens[indice]} alt="" />)
    }
    if (node.name === 'div' && Array.isArray(node.children) && node.children.some(filho =>
      filho.type === 'tag' && filho.name === 'span' && filho.children.some(texto => texto.type === 'text' && texto.data.trim() === '1/50'))) {
      return comProps(node, {}, nft.edicoes.map(item => <button key={item.id} type="button"
        className={`rounded-full border px-2 py-[2px] text-[11px] ${item.id === edicaoId ? 'border-kurio-destaque text-kurio-destaque' : 'border-kurio-borda text-kurio-secundaria'}`}
        aria-pressed={item.id === edicaoId} aria-label={item.nome + (!item.estoque ? ' · Esgotada' : '')}
        onClick={() => { setEdicao(item.id); setQtd(1) }}>{item.nome.toUpperCase()}</button>))
    }
    if (id === 'detalhes-mercado') return comProps(node, {}, <>
      <div className="detalhe-mobile-topo">
        <Link to="/" hash="mercado" aria-label="Voltar ao mercado"><ChevronLeft size={16} /></Link>
        <button type="button" aria-label={favorito.ativo ? `Remover ${nft.nome} dos favoritos` : `Favoritar ${nft.nome}`}
          aria-pressed={favorito.ativo} onClick={favorito.alternar}><Heart size={16} fill={favorito.ativo ? 'currentColor' : 'none'} /></button>
      </div>
      {filhos()}
    </>)
    if (node.name === 'div' && node.children.some(filho => filho.type === 'tag' && 'attribs' in filho && filho.attribs.id === 'mercado-comprar')) {
      return comProps(node, { className: props.className + ' referencia-acoes-nft' }, <>{filhos()}
        <button type="button" className="referencia-adicionar" aria-label="Adicionar ao carrinho" onClick={() => void adicionar(false)}
          disabled={!edicao.estoque || mutation.isPending}><ShoppingCart size={16} /></button></>)
    }
    if (node.name === 'div' && node.children.some(filho => filho.type === 'tag' && 'attribs' in filho
      && filho.attribs['aria-label'] === 'Quantidade de NFTs')) {
      return comProps(node, { className: props.className + ' referencia-compra-nft' }, <>{filhos()}
        <strong className="detalhe-mobile-preco">{exibirEth(edicao.preco)}</strong></>)
    }
    if (node.name === 'div' && node.attribs['aria-label'] === 'Quantidade de NFTs') {
      return comProps(node, {}, <><span className="detalhe-mobile-qtd">Qtd.</span>{filhos()}</>)
    }
    if (id === 'mercado-diminuir') return comProps(node, { disabled: quantidade <= 1, onClick: () => setQtd(quantidade - 1) }, filhos())
    if (id === 'mercado-aumentar') return comProps(node, { disabled: quantidade >= edicao.estoque, onClick: () => setQtd(quantidade + 1) }, filhos())
    if (id === 'mercado-comprar') return comProps(node, { 'aria-label': 'Comprar NFT', disabled: !edicao.estoque || mutation.isPending,
      onClick: () => void adicionar(true) }, <><span className="detalhe-desktop-compra">{filhos()}</span><span className="detalhe-mobile-compra">Comprar NFT</span></>)
    if (id === 'mercado-favoritar') return comProps(node, { onClick: favorito.alternar, disabled: favorito.desabilitado,
      'aria-pressed': favorito.ativo, 'aria-label': favorito.ativo ? `Remover ${nft.nome} dos favoritos` : `Favoritar ${nft.nome}` }, filhos())
    if (node.name === 'div' && node.attribs['aria-label'] === 'Avaliação média de colecionadores') return comProps(node, {}, <>
      <span className="detalhe-desktop-avaliacao">{filhos()}</span><span className="detalhe-mobile-avaliacao">★ 4.8(19)</span>
    </>)
    if (temClasse(node, 'mercado-resumo')) return comProps(node, {}, <>{filhos()}
      {!edicao.estoque && <p role="status">Esta edição está esgotada.</p>}
      <Erro erro={mutation.error} />
    </>)
    if (id === 'mercado-ampliar') return comProps(node, { onClick: () => setZoom(true) }, filhos())
    if (id === 'mercado-aba-detalhes' || id === 'mercado-aba-avaliacoes') {
      const ativa = id === 'mercado-aba-avaliacoes' ? avaliacoes : !avaliacoes
      const classe = String(props.className).replace(/border-kurio-destaque|text-kurio-destaque/g, '')
      return comProps(node, { 'aria-selected': ativa, className: classe + (ativa ? ' border-kurio-destaque text-kurio-destaque' : ''),
        onClick: () => setAvaliacoes(id === 'mercado-aba-avaliacoes') }, filhos())
    }
    if (id === 'mercado-painel-detalhes' || id === 'mercado-painel-avaliacoes') {
      return comProps(node, ocultar(props, id === 'mercado-painel-detalhes' ? avaliacoes : !avaliacoes), filhos())
    }
    if (id === 'mercado-lista-relacionados') return comProps(node, {}, relacionados.data?.itens.filter(item => item.id !== nft.id)
      .slice(0, 4).map((item, i) => <CartaoVisual key={item.id} nft={item} posicao={i} />) ?? [])
    if (node.attribs['data-compartilhar']) return comProps(node, { onClick: async () => {
      const tipo = node.attribs['data-compartilhar']
      if (tipo === 'email') { location.href = `mailto:?subject=${encodeURIComponent(nft.nome)}&body=${encodeURIComponent(location.href)}`; return }
      if (tipo === 'copiar') { await navigator.clipboard.writeText(location.href); avisar('Link copiado.'); return }
      if (tipo === 'linkedin' || tipo === 'x') {
        const link = tipo === 'linkedin' ? 'https://www.linkedin.com/sharing/share-offsite/?url=' : 'https://x.com/intent/tweet?url='
        window.open(link + encodeURIComponent(location.href), '_blank', 'noopener,noreferrer')
      }
    } }, filhos())
    return undefined
  }
  return <Referencia pagina="mercado" alterar={visual} extras={<Janela titulo={nft.nome} descricao="Imagem ampliada."
    aberta={zoom} aoMudar={setZoom}>
      <img className="w-full rounded-xl" src={nft.imagens[imagem]} alt={nft.nome} />
      <div className="mt-3 flex gap-2" aria-label="Miniaturas do NFT">
        {nft.imagens.map((src, indice) => <button key={src} type="button" className="w-12 rounded border border-kurio-borda"
          aria-label={`Selecionar imagem ${indice + 1}`} aria-pressed={indice === imagem} onClick={() => setImagem(indice)}>
          <img src={src} alt="" /></button>)}
      </div>
    </Janela>} />
}
