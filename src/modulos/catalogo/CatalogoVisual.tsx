import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { memo, useState } from 'react'
import { Heart, Search, SlidersHorizontal } from 'lucide-react'
import { useFavorito } from '../nft/Favoritar'
import { Button, Erro, Janela, Skeleton } from '../../componentes/ui'
import { comProps, definirReferencia, encontrar, modelo, Referencia, renderizar, temClasse, texto, type Alterar } from '../../componentes/Referencia'
import { buscaCatalogo, categorias, exibirEth, redes, type BuscaCatalogo, type Nft } from '../../contratos/mercado'
import { mercadoApi } from '../../integracoes/api'
import { useSessao } from '../../app/contexto'
import { useCarrinhoMutation } from '../carrinho/estado'
import html from '../../referencias/inicio.html?raw'

const pagina = definirReferencia('inicio', html)

export function PaginaCatalogoVisual({ filtros, navegar }: { filtros: BuscaCatalogo; navegar: (mudanca: Partial<BuscaCatalogo>) => void }) {
  const [destaque, setDestaque] = useState(0)
  const [faixaAberta, setFaixaAberta] = useState(false)
  const [minimo, setMinimo] = useState('')
  const [maximo, setMaximo] = useState('')
  const [filtrosMobile, setFiltrosMobile] = useState(false)
  const consulta = useQuery({ queryKey: ['catalogo', filtros], queryFn: ({ signal }) => mercadoApi.catalogo(filtros, signal) })
  const mutation = useCarrinhoMutation()
  const { avisar } = useSessao()
  const mudar = (mudanca: Partial<BuscaCatalogo>) => navegar({ pagina: 1, ...mudanca })
  const dados = consulta.data
  const obra = dados?.destaques[destaque]
  const adicionar = (nft: Nft) => mutation.mutate({ acao: 'adicionar', item: { nftId: nft.id, edicaoId: nft.edicoes[0].id, quantidade: 1 } },
    { onSuccess: () => avisar('NFT adicionado ao carrinho.') })
  const botoes = ['todos', 'lancamentos', 'em-alta'] as const
  let ponto = 0
  const visual: Alterar = (node, props, filhos) => {
    if (temClasse(node, 'barra-lateral')) return comProps(node, { className: props.className + ' referencia-filtros', 'aria-label': 'Filtros do catálogo' }, filhos())
    if (temClasse(node, 'imagem-banner')) return <div className="referencia-imagem-banner">
      {comProps(node, obra ? { src: obra.imagens[0], alt: obra.nome, fetchPriority: 'high' } : { src: '/images/primeape1.webp' })}
      <img className="referencia-mini-banner" src="/images/primeape2-thumb.webp" alt="" />
    </div>
    if (temClasse(node, 'titulo-principal')) return comProps(node, {}, <>
      <span className="referencia-titulo-desktop">{filhos()}</span>
      <span className="referencia-titulo-mobile">SEJA DONO DA CULTURA DIGITAL</span>
    </>)
    if (temClasse(node, 'ponto-banner')) {
      const i = ponto++
      return <button type="button" className={String(props.className)} aria-label={`Destaque ${i + 1}`} aria-pressed={destaque === i} onClick={() => setDestaque(i)} />
    }
    if (temClasse(node, 'descricao')) return comProps(node, {}, <>
      <span className="referencia-titulo-desktop">{filhos()}</span>
      <span className="referencia-titulo-mobile">Descubra NFTs selecionados de criadores do mundo todo.</span>
    </>)
    if (temClasse(node, 'botao-explorar')) return comProps(node, { onClick: () => document.getElementById('mercado')?.scrollIntoView() }, filhos())
    if (node.name === 'label' && temClasse(node, 'item-filtro')) {
      const nome = texto(node).replace(/\s*\(\d+\)$/, '').trim()
      const categoria = categorias.find(categoria => categoria === nome)
      const rede = redes.find(rede => rede === nome)
      const ativo = categoria ? filtros.categorias.includes(categoria) : rede ? filtros.redes.includes(rede) : false
      function alternar() {
        if (categoria) mudar({ categorias: ativo ? filtros.categorias.filter(item => item !== categoria) : [...filtros.categorias, categoria] })
        if (rede) mudar({ redes: ativo ? filtros.redes.filter(item => item !== rede) : [...filtros.redes, rede] })
      }
      const classes = String(props.className).replace(/\bfiltro-ativo\b|(?<!:)\btext-kurio-destaque\b(?!-)/g, '')
      return <label className={classes + ((ativo || (nome === 'Arte digital' && !filtros.categorias.length)) ? ' filtro-selecionado' : '')}>
        <input className="sr-only" aria-label={nome} type="checkbox" checked={ativo} onChange={alternar} />
        {filhos()}
      </label>
    }
    if (temClasse(node, 'texto-preco') && (filtros.minimo || filtros.maximo)) {
      return comProps(node, {}, `Preço: ${filtros.minimo || '0,02'} - ${filtros.maximo || '12,30'} ETH`)
    }
    if (temClasse(node, 'botao-aplicar')) return comProps(node, { onClick: () => {
      setMinimo(filtros.minimo); setMaximo(filtros.maximo); setFaixaAberta(true)
    } }, filhos())
    if (temClasse(node, 'aba-nft')) {
      const valor = texto(node).startsWith('Novos') ? botoes[1] : texto(node) === 'Em alta' ? botoes[2] : botoes[0]
      const ativo = filtros.vitrine === valor
      const classes = String(props.className).replace(/\baba-ativa\b|(?<!:)\bborder-kurio-destaque\b|(?<!:)\btext-kurio-destaque\b/g, '')
      return <button type="button" className={classes + (ativo ? ' border-kurio-destaque text-kurio-destaque' : '')}
        aria-pressed={ativo} onClick={() => mudar({ vitrine: valor })}>{filhos()}</button>
    }
    if (temClasse(node, 'seletor-ordenacao')) {
      return <select className={String(props.className)} value={filtros.ordem} aria-label="Ordenação"
        onChange={e => mudar({ ordem: buscaCatalogo.shape.ordem.parse(e.target.value) })}>
        <option value="recentes">Listados recentemente</option><option value="menor-preco">Menor preço</option><option value="maior-preco">Maior preço</option>
      </select>
    }
    if (temClasse(node, 'grade-nfts')) {
      const inicial = filtros.pagina === 1 && filtros.ordem === 'recentes' && filtros.vitrine === 'todos' && !filtros.busca
        && !filtros.categorias.length && !filtros.redes.length && !filtros.minimo && !filtros.maximo
      return comProps(node, { 'aria-busy': consulta.isPending, 'data-grade-inicial': inicial }, <>
      {consulta.isPending && Array.from({ length: 9 }, (_, i) => <Skeleton className="aspect-square" key={i} />)}
      {dados?.itens.map((nft, i) => <CartaoVisual key={nft.id} nft={nft} posicao={i} adicionar={() => adicionar(nft)} />)}
      {dados?.itens.length === 0 && <p>Nenhum NFT encontrado.</p>}
    </>)
    }
    if (temClasse(node, 'paginacao')) {
      const modelo = node.children.find(filho => filho.type === 'tag')
      if (!modelo || modelo.type !== 'tag') return <></>
      const comum = modelo.attribs.class.replace(/\bpagina-ativa\b|(?<!:)\bborder-kurio-destaque\b|\bbg-kurio-destaque\b|(?<!:)\btext-kurio-fundo\b/g, '')
      return comProps(node, {}, <>
        {Array.from({ length: dados?.paginas ?? 0 }, (_, i) => <button key={i} type="button"
          className={comum + (filtros.pagina === i + 1 ? ' border-kurio-destaque bg-kurio-destaque text-kurio-fundo' : '')}
          aria-current={filtros.pagina === i + 1 ? 'page' : undefined} onClick={() => navegar({ pagina: i + 1 })}>{i + 1}</button>)}
        {!!dados && dados.paginas > 1 && <button className={comum} type="button" aria-label="Próxima página"
          disabled={filtros.pagina >= dados.paginas} onClick={() => navegar({ pagina: filtros.pagina + 1 })}> &gt; </button>}
        <span className="sr-only">Página {filtros.pagina} de {dados?.paginas ?? 1}</span>
      </>)
    }
    if (node.attribs.id === 'inicio') {
      return comProps(node, { id: 'inicio', tabIndex: -1 }, <>
        <div className="referencia-busca-mobile">
          <Search size={17} aria-hidden="true" />
          <input aria-label="Explorar coleções" placeholder="Explorar coleções" value={filtros.busca}
            onChange={e => mudar({ busca: e.target.value })} />
          <Button onClick={() => setFiltrosMobile(true)} aria-label="Abrir filtros"><SlidersHorizontal size={17} /></Button>
        </div>
        {filhos()}
      </>)
    }
    if (temClasse(node, 'barra-catalogo')) return comProps(node, {}, <>{filhos()}
      <label className="referencia-busca-desktop sr-only">Explorar coleções<input value={filtros.busca} onChange={e => mudar({ busca: e.target.value })} /></label>
      <span className="sr-only" role="status">{dados ? `${dados.total} NFTs` : 'Carregando NFTs…'}</span>
      <Erro erro={consulta.error || mutation.error} tentar={consulta.error ? () => void consulta.refetch() : undefined} />
    </>)
    return undefined
  }
  return <Referencia pagina={pagina} alterar={visual} busca={{ valor: filtros.busca, mudar: busca => mudar({ busca }) }} extras={<>
    <Janela titulo="Faixa de preço" descricao="Informe os valores em ETH." aberta={faixaAberta} aoMudar={setFaixaAberta}>
      <form className="flex flex-col gap-3" onSubmit={e => {
        e.preventDefault()
        const preco = buscaCatalogo.parse({ minimo: minimo.replace(',', '.'), maximo: maximo.replace(',', '.') })
        mudar({ minimo: preco.minimo, maximo: preco.maximo })
        setFaixaAberta(false)
      }}>
        <label>Mínimo<input className="entrada" inputMode="decimal" value={minimo} onChange={e => setMinimo(e.target.value)} /></label>
        <label>Máximo<input className="entrada" inputMode="decimal" value={maximo} onChange={e => setMaximo(e.target.value)} /></label>
        <Button type="submit">Aplicar</Button>
      </form>
    </Janela>
    <Janela titulo="Filtros" descricao="Filtre por coleção e rede." aberta={filtrosMobile} aoMudar={setFiltrosMobile} lateral>
      {categorias.map(categoria => <label className="my-2 block" key={categoria}><input type="checkbox" checked={filtros.categorias.includes(categoria)}
        onChange={e => mudar({ categorias: e.target.checked ? [...filtros.categorias, categoria] : filtros.categorias.filter(a => a !== categoria) })} /> {categoria}</label>)}
      {redes.map(rede => <label className="my-2 block" key={rede}><input type="checkbox" checked={filtros.redes.includes(rede)}
        onChange={e => mudar({ redes: e.target.checked ? [...filtros.redes, rede] : filtros.redes.filter(a => a !== rede) })} /> {rede}</label>)}
      <label className="my-3 block">Ordenar
        <select className="entrada" aria-label="Ordenação" value={filtros.ordem}
          onChange={e => mudar({ ordem: buscaCatalogo.shape.ordem.parse(e.target.value) })}>
          <option value="recentes">Listados recentemente</option><option value="menor-preco">Menor preço</option><option value="maior-preco">Maior preço</option>
        </select>
      </label>
      <Button variant="outline" onClick={() => { setFiltrosMobile(false); setFaixaAberta(true) }}>Faixa de preço</Button>
      <Button onClick={() => setFiltrosMobile(false)}>Ver resultados</Button>
    </Janela>
  </>} />
}

let catalogo: ReturnType<typeof modelo> | undefined
export const CartaoVisual = memo(function CartaoVisual({ nft, posicao, adicionar }: {
  nft: Nft; posicao: number; adicionar?: () => void
}) {
  const favorito = useFavorito(nft.id)
  const modeloId = 'nft-' + String(posicao % 9 + 1).padStart(2, '0')
  catalogo ??= modelo(pagina, 'mercado')
  const cartao = encontrar(catalogo, node => node.attribs['data-nft-id'] === modeloId)
  if (!cartao) return null
  const nome = <Link to="/nfts/$nftId" params={{ nftId: nft.id }}>{nft.nome}</Link>
  const preco = <>{exibirEth(nft.edicoes[0].preco)}
    {!nft.edicoes[0].estoque && <span className="sr-only"> · Edição esgotada</span>}</>
  const semDadosVisuais = !encontrar(cartao, node => temClasse(node, 'nome-nft'))
  return renderizar(cartao, (node, _props, filhos) => {
    if (node === cartao) {
      return comProps(node, { 'data-nft-id': nft.id, 'data-raro': nft.destaque === 'Raro' }, <>{filhos()}
        {semDadosVisuais && <div className="referencia-dados-nft-mobile">
          <p className="nome-nft truncate">{nome}</p>
          <p className="preco-nft text-[13px] font-bold text-kurio-destaque min-[501px]:text-[15px]">{preco}</p>
        </div>}
      </>)
    }
    if (temClasse(node, 'fundo-imagem-nft')) return comProps(node, {}, <>{filhos()}
      {nft.destaque === 'Raro' && <span className="referencia-nft-raro">RARO</span>}
      <button type="button" className="referencia-favorito-mobile" aria-pressed={favorito.ativo}
        aria-label={favorito.ativo ? `Remover ${nft.nome} dos favoritos` : `Favoritar ${nft.nome}`}
        onClick={favorito.alternar} disabled={favorito.desabilitado}><Heart size={14} fill={favorito.ativo ? 'currentColor' : 'none'} /></button>
    </>)
    if (node.name === 'img') return <Link to="/nfts/$nftId" params={{ nftId: nft.id }}>
      {comProps(node, { src: nft.imagens[0], alt: nft.nome, loading: posicao < 7 ? 'eager' : 'lazy' })}
    </Link>
    if (temClasse(node, 'preco-antigo')) return comProps(node, {}, filhos())
    if (temClasse(node, 'nome-nft')) return comProps(node, {}, nome)
    if (temClasse(node, 'preco-nft')) {
      const antigo = encontrar(node, item => temClasse(item, 'preco-antigo'))
      return comProps(node, {}, <>{preco}
        {antigo && nft.id === modeloId && <> {comProps(antigo, {}, texto(antigo))}</>}</>)
    }
    if (temClasse(node, 'adicionar-carrinho')) return adicionar ? comProps(node, { onClick: adicionar, disabled: !nft.edicoes[0].estoque, 'aria-label': `Adicionar ${nft.nome} ao carrinho` }, filhos()) : <></>
    return undefined
  })
})
