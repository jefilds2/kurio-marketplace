import { eth, wei, type Cotacao, type Item, type Pedido, type PedidoInput, type Rede } from '../contratos/mercado'
import { carrinhoDo, editarBanco, falhar, type Banco } from './banco'

const taxas: Record<Rede, string> = { Ethereum: '0.016', Polygon: '0.004', Solana: '0.002' }
export const mesmaEdicao = (a: Item, b: Item) => a.nftId === b.nftId && a.edicaoId === b.edicaoId

export function encontrarEdicao(banco: Banco, item: Item) {
  const nft = banco.nfts.find(nft => nft.id === item.nftId)
  const edicao = nft?.edicoes.find(edicao => edicao.id === item.edicaoId)
  if (!nft || !edicao) falhar(404, 'edicao-inexistente', 'Esta edição não foi encontrada.')
  return { nft, edicao }
}
export function quantidadeReservada(banco: Banco, item: Item) {
  return Object.values(banco.reserva).flat().filter(reserva => mesmaEdicao(reserva, item))
    .reduce((total, linha) => total + linha.quantidade, 0)
}
export function alterarItem(banco: Banco, dono: string, item: Item, adicionar: boolean) {
  const carrinho = carrinhoDo(banco, dono)
  const anterior = carrinho.itens.find(linha => mesmaEdicao(linha, item))
  const quantidade = item.quantidade + (adicionar ? (anterior?.quantidade ?? 0) : 0)
  const { edicao } = encontrarEdicao(banco, item)
  const disponivel = edicao.estoque - quantidadeReservada(banco, item)
  const reduzindo = !adicionar && anterior && quantidade < anterior.quantidade
  if (quantidade > disponivel && !reduzindo) {
    falhar(409, 'estoque', 'A edição não tem essa quantidade disponível.')
  }
  if (anterior) anterior.quantidade = quantidade
  else carrinho.itens.push({ ...item, quantidade })
}
export function validarCupom(codigo: string) {
  if (!codigo || codigo === 'KURIO10') return
  if (codigo === 'EXPIRADO') falhar(422, 'cupom-expirado', 'Este cupom expirou.', { campos: { codigo: 'Cupom expirado.' } })
  falhar(422, 'cupom-invalido', 'O cupom informado é inválido.', { campos: { codigo: 'Cupom inválido.' } })
}
export function calcularCotacao(banco: Banco, dono: string, rede: Rede): Cotacao {
  const carrinho = carrinhoDo(banco, dono)
  const problemas: string[] = []
  const linhas = carrinho.itens.map(item => {
    const { nft, edicao } = encontrarEdicao(banco, item)
    const estoque = Math.max(0, edicao.estoque - quantidadeReservada(banco, item))
    if (item.quantidade > estoque) problemas.push(`${nft.nome}, edição ${edicao.nome}: ${estoque} disponível(is).`)
    return { ...item, nome: nft.nome, edicao: edicao.nome, imagem: nft.imagens[0], preco: edicao.preco,
      total: eth(wei(edicao.preco) * BigInt(item.quantidade)), estoque, versao: nft.versao }
  })
  const subtotal = linhas.reduce((total, linha) => total + wei(linha.total), 0n)
  const desconto = carrinho.cupom === 'KURIO10' ? subtotal / 10n : 0n
  const taxa = linhas.length ? wei(taxas[rede]) : 0n
  const assinatura = linhas.map(linha => [linha.nftId, linha.edicaoId, linha.quantidade, linha.preco, linha.estoque, linha.versao])
  return {
    id: JSON.stringify([rede, carrinho.cupom, eth(taxa), assinatura]),
    rede, linhas, subtotal: eth(subtotal), desconto: eth(desconto), taxa: eth(taxa),
    total: eth(subtotal - desconto + taxa), cupom: carrinho.cupom, problemas,
  }
}
export function criarPedido(banco: Banco, usuarioId: string, token: string, chave: string, proposta: PedidoInput) {
  const indice = `${usuarioId}:${chave}`
  const corpo = JSON.stringify(proposta)
  const tentativa = banco.tentativas[indice]
  if (tentativa) {
    if (tentativa.corpo !== corpo) falhar(409, 'idempotencia', 'Esta chave já pertence a outra tentativa.')
    return { pedido: banco.pedidos[tentativa.pedidoId], criado: false }
  }
  if (Object.values(banco.pedidos).some(pedido => pedido.usuarioId === usuarioId && pedido.estado === 'pendente')) {
    falhar(409, 'pedido-pendente', 'Você já tem um pedido pendente. Consulte o pedido em andamento.')
  }
  const conexao = banco.conexoes[proposta.conexaoId]
  const carteira = banco.contas[usuarioId].carteiras.find(carteira => carteira.id === conexao?.carteiraId)
  if (conexao?.token !== token || !carteira || conexao.rede !== proposta.rede || carteira.rede !== proposta.rede) {
    falhar(409, 'carteira-desconectada', 'Conecte novamente a carteira selecionada.')
  }
  const cotacao = calcularCotacao(banco, usuarioId, proposta.rede)
  if (cotacao.id !== proposta.cotacaoId) falhar(409, 'cotacao-alterada', 'A cotação mudou. Revise os valores antes de confirmar novamente.', { cotacao })
  if (cotacao.problemas.length || !cotacao.linhas.length) falhar(409, 'cotacao-invalida', 'Revise os itens e a disponibilidade antes de comprar.', { cotacao })
  const agora = Date.now()
  const pedido: Pedido = { id: crypto.randomUUID(), usuarioId, estado: 'pendente', versao: 1,
    criadoEm: agora, resolverEm: agora + (banco.cenario === 'pedido-pendente' ? 8_000 : 1_500),
    cotacao, coletor: proposta.coletor, carteira: { ...carteira } }
  banco.pedidos[pedido.id] = pedido
  banco.tentativas[indice] = { corpo, pedidoId: pedido.id }
  banco.reserva[pedido.id] = cotacao.linhas.map(({ nftId, edicaoId, quantidade }) => ({ nftId, edicaoId, quantidade }))
  banco.pagamento[pedido.id] = banco.cenario === 'pagamento-recusado' ? 'recusado' : 'confirmado'
  return { pedido, criado: true }
}
export async function resolverPedidos() {
  return editarBanco(banco => {
    const pedidos: Pedido[] = []
    const alterados = new Map<string, number>()
    for (const pedido of Object.values(banco.pedidos)) {
      if (pedido.estado !== 'pendente' || pedido.resolverEm > Date.now()) continue
      pedido.estado = banco.pagamento[pedido.id]
      pedido.versao++
      const reserva = banco.reserva[pedido.id] ?? []
      delete banco.reserva[pedido.id]
      for (const compra of reserva) {
        const { nft, edicao } = encontrarEdicao(banco, compra)
        nft.versao++
        alterados.set(nft.id, nft.versao)
        if (pedido.estado === 'confirmado') edicao.estoque = Math.max(0, edicao.estoque - compra.quantidade)
      }
      if (pedido.estado === 'confirmado') {
        pedido.transacao = '0x' + pedido.id.replaceAll('-', '')
        const carrinho = carrinhoDo(banco, pedido.usuarioId)
        carrinho.itens = carrinho.itens.map(linha => ({
          ...linha, quantidade: linha.quantidade - (reserva.find(compra => mesmaEdicao(compra, linha))?.quantidade ?? 0),
        })).filter(linha => linha.quantidade > 0)
        if (!carrinho.itens.length) carrinho.cupom = ''
      }
      pedidos.push(pedido)
    }
    return { pedidos, alterados }
  })
}
