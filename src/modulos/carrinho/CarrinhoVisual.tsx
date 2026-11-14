import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { carrinhoConsulta } from '../../app/consultas'
import { useSessao } from '../../app/contexto'
import { comProps, modelo, ocultar, Referencia, renderizar, type Alterar } from '../../componentes/Referencia'
import { Erro, Skeleton } from '../../componentes/ui'
import { buscaCatalogo, exibirEth, type Linha } from '../../contratos/mercado'
import { erroDaApi, mercadoApi } from '../../integracoes/api'
import { CartaoVisual } from '../catalogo/CatalogoVisual'
import { useCarrinhoMutation } from './estado'

const template = modelo('carrinho', 'carrinho-modelo-item').children.find(node => node.type === 'tag')!

export function CarrinhoVisual() {
  const { sessao } = useSessao()
  const navigate = useNavigate()
  const [sugestoes, paginar] = useState(0)
  const consulta = useQuery(carrinhoConsulta(sessao?.perfil.id ?? 'visitante'))
  const mudar = useCarrinhoMutation()
  const cotacao = consulta.data
  const catalogo = useQuery({ queryKey: ['catalogo', 'sugestoes', sugestoes], queryFn: ({ signal }) =>
    mercadoApi.catalogo(buscaCatalogo.parse({ pagina: sugestoes + 1 }), signal) })
  const valores = cotacao && {
    'carrinho-subtotal': exibirEth(cotacao.subtotal), 'carrinho-desconto': '(-) ' + exibirEth(cotacao.desconto),
    'carrinho-taxa': exibirEth(cotacao.taxa), 'carrinho-total': exibirEth(cotacao.total),
  }
  const alterarQtd = (linha: Linha, quantidade: number) => mudar.mutate({ acao: 'alterar', item: { ...linha, quantidade } })
  const visual: Alterar = (node, props, filhos) => {
    const id = node.attribs.id
    if (id && valores && Object.hasOwn(valores, id)) return comProps(node, {}, valores[id as keyof typeof valores])
    if (id === 'pagina-carrinho') return comProps(node, {}, <>
      <header className="referencia-titulo-fluxo"><Link to="/" aria-label="Voltar ao início">‹</Link><h1>Carrinho de NFTs</h1></header>{filhos()}
    </>)
    if (id === 'carrinho-lista') return comProps(node, { 'aria-busy': consulta.isPending }, <>
      {consulta.isPending && <Skeleton className="h-28" />}
      {cotacao?.linhas.map(linha => <LinhaVisual key={linha.nftId + linha.edicaoId} linha={linha} pendente={mudar.isPending}
        alterar={quantidade => alterarQtd(linha, quantidade)} remover={() => mudar.mutate({ acao: 'remover', item: linha })} />)}
      <Erro erro={consulta.error} tentar={() => void consulta.refetch()} />
    </>)
    if (id === 'carrinho-vazio') return comProps(node, ocultar(props, !cotacao || !!cotacao.linhas.length), filhos())
    if (id === 'carrinho-alerta-item') return comProps(node, ocultar(props, !cotacao?.problemas.length), cotacao?.problemas.join(' ') ?? '')
    if (id === 'carrinho-formulario-cupom') return comProps(node, { onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      mudar.mutate({ acao: 'cupom', codigo: String(new FormData(e.currentTarget).get('codigo') ?? '') })
    } }, filhos())
    if (id === 'carrinho-retorno-cupom') return comProps(node, { role: mudar.isError ? 'alert' : 'status' },
      mudar.isError ? (erroDaApi(mudar.error).campos?.codigo ?? erroDaApi(mudar.error).mensagem) : cotacao?.cupom ? `Cupom ${cotacao.cupom} aplicado.` : '')
    if (id === 'carrinho-remover-cupom') return comProps(node, { ...ocultar(props, !cotacao?.cupom),
      onClick: () => mudar.mutate({ acao: 'cupom', codigo: '' }) }, filhos())
    if (id === 'carrinho-finalizar') return comProps(node, { disabled: !cotacao?.linhas.length || !!cotacao.problemas.length, onClick: () => {
      void (sessao ? navigate({ to: '/pagamento' }) : navigate({ to: '/login', search: { retorno: '/pagamento' } }))
    } }, filhos())
    if (id === 'carrinho-grade-sugestoes') return comProps(node, {}, catalogo.data?.itens.slice(0, 5)
      .map((nft, posicao) => <CartaoVisual key={nft.id} nft={nft} posicao={posicao} />) ?? [])
    if (node.attribs['data-carrinho-pagina'] !== undefined) {
      const pagina = Number(node.attribs['data-carrinho-pagina'])
      return comProps(node, { className: String(props.className).replace(/ bg-(?:kurio-destaque|transparent)(?=\s|$)/g, '') +
        (sugestoes === pagina ? ' bg-kurio-destaque' : ' bg-transparent'),
      'aria-pressed': sugestoes === pagina, onClick: () => paginar(pagina) }, filhos())
    }
    return undefined
  }
  return <Referencia pagina="carrinho" alterar={visual} />
}
function LinhaVisual({ linha, pendente, alterar, remover }: { linha: Linha; pendente: boolean; alterar: (q: number) => void; remover: () => void }) {
  return renderizar(template, (node, props, filhos) => {
    const a = node.attribs
    if ('data-carrinho-link' in a) return <Link data-carrinho-link="" className={String(props.className)} to="/nfts/$nftId" params={{ nftId: linha.nftId }}>
      {filhos()}<strong className="linha-mobile-preco">{exibirEth(linha.total)}</strong>
    </Link>
    if ('data-carrinho-imagem' in a) return comProps(node, { src: linha.imagem, alt: linha.nome })
    if ('data-carrinho-nome' in a) return comProps(node, {}, linha.nome)
    if ('data-carrinho-token' in a) return comProps(node, {}, 'Edição: ' + linha.edicao)
    if ('data-carrinho-preco' in a) return comProps(node, {}, exibirEth(linha.preco))
    if ('data-carrinho-total-item' in a) return comProps(node, {}, exibirEth(linha.total))
    if ('data-carrinho-quantidade' in a) return comProps(node, {}, linha.quantidade)
    if ('data-carrinho-diminuir' in a) return comProps(node, { disabled: pendente || linha.quantidade <= 1, onClick: () => alterar(linha.quantidade - 1) }, filhos())
    if ('data-carrinho-aumentar' in a) return comProps(node, { disabled: pendente || linha.quantidade >= linha.estoque, onClick: () => alterar(linha.quantidade + 1) }, filhos())
    if ('data-carrinho-remover' in a) return comProps(node, { disabled: pendente, 'aria-label': `Remover ${linha.nome}`, onClick: remover }, filhos())
    return undefined
  })
}
