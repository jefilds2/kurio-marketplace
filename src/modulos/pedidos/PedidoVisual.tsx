import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { cache } from '../../app/consultas'
import { useSessao } from '../../app/contexto'
import { Button, Erro, Janela, Skeleton } from '../../componentes/ui'
import { comProps, modelo, ocultar, Referencia, renderizar, type Alterar } from '../../componentes/Referencia'
import { exibirEth } from '../../contratos/mercado'
import { mercadoApi } from '../../integracoes/api'
import { guardarTentativa, lerTentativa } from './tentativa'

const template = modelo('confirmacao', 'confirmacao-modelo-item').children.find(node => node.type === 'tag')!

export function PedidoVisual({ id }: { id: string }) {
  const { sessao } = useSessao()
  const navigate = useNavigate()
  const [explorador, setExplorador] = useState(false)
  const dono = sessao?.perfil.id ?? ''
  const consulta = useQuery({
    queryKey: ['privado', dono, 'pedido', id], queryFn: ({ signal }) => mercadoApi.pedido(id, signal),
    refetchInterval: query => query.state.data?.estado === 'pendente' ? 6000 : false, staleTime: 0,
  })
  const pedido = consulta.data
  useEffect(() => {
    if (!pedido || pedido.estado === 'pendente') return
    if (lerTentativa(dono)?.pedidoId === pedido.id) guardarTentativa(dono, null)
    void cache.invalidateQueries({ queryKey: ['carrinho', dono] })
  }, [dono, pedido])
  if (consulta.isPending) return <Skeleton className="mx-auto my-8 h-80 max-w-[580px]" />
  if (!pedido) return <main className="mx-auto max-w-[580px] px-4 py-8"><h1>Pedido indisponível</h1><Erro erro={consulta.error} tentar={() => void consulta.refetch()} /></main>
  if (pedido.estado !== 'confirmado') return <main className="design-kurio mx-auto max-w-[580px] px-4 py-8 font-kurio">
    <h1 className="text-[15px] font-bold">{pedido.estado === 'pendente' ? 'Pedido pendente' : 'Pagamento recusado'}</h1>
    <p className="my-4 text-[12px] text-kurio-secundaria">{pedido.estado === 'pendente' ? 'Aguardando a confirmação do pagamento.' : 'Seus itens continuam no carrinho.'}</p>
    {pedido.estado === 'pendente' && <Button variant="outline" onClick={() => void consulta.refetch()}>Consultar status</Button>}
    {' '}<Link className="underline" to="/carrinho">Voltar ao carrinho</Link>
    <Erro erro={consulta.error} />
  </main>
  const dados: Record<string, string> = {
    'confirmacao-id': pedido.transacao ?? '—',
    'confirmacao-data': new Date(pedido.criadoEm).toLocaleDateString('pt-BR'),
    'confirmacao-total-topo': exibirEth(pedido.cotacao.total),
    'confirmacao-carteira': pedido.carteira.nome,
    'confirmacao-taxa': exibirEth(pedido.cotacao.taxa),
    'confirmacao-total': exibirEth(pedido.cotacao.total),
    'confirmacao-mensagem': 'Sua transação foi confirmada. Os NFTs foram enviados para sua carteira simulada.',
    'confirmacao-status': 'Pedido confirmado',
  }
  const visual: Alterar = (node, props, filhos) => {
    const id = node.attribs.id
    if (id && Object.hasOwn(dados, id)) return comProps(node, id === 'confirmacao-status' ? ocultar(props, false) : {}, dados[id])
    if (id === 'confirmacao-fechar') return comProps(node, { onClick: () => void navigate({ to: '/' }) }, filhos())
    if (id === 'confirmacao-etherscan') return comProps(node, { disabled: false, onClick: () => setExplorador(true) }, filhos())
    if (id === 'confirmacao-lista') return comProps(node, {}, pedido.cotacao.linhas.map(linha => <div key={linha.nftId + linha.edicaoId}>
      {renderizar(template, (n, p) => {
        const a = n.attribs
        if ('data-item-imagem' in a) return comProps(n, { src: linha.imagem, alt: linha.nome })
        if ('data-item-nome' in a) return comProps(n, {}, linha.nome)
        if ('data-item-token' in a) return comProps(n, {}, 'Edição: ' + linha.edicao)
        if ('data-item-quantidade' in a) return comProps(n, {}, linha.quantidade)
        if ('data-item-subtotal' in a) return comProps(n, {}, exibirEth(linha.total))
        return p.hidden ? <></> : undefined
      })}
    </div>))
    return undefined
  }
  return <Referencia pagina="confirmacao" alterar={visual} extras={<Janela titulo="Explorador de transação simulado"
    descricao="Referência registrada no pedido da demonstração." aberta={explorador} aoMudar={setExplorador}>
      <p className="break-all">{pedido.transacao}</p><p>Rede {pedido.cotacao.rede}</p>
    </Janela>} />
}
