import { delay, http, HttpResponse } from 'msw'
import { z } from 'zod/mini'
import { buscaCatalogo, cenarios, cotar, cupom, decimal, item, pedido, wei, type Nft } from '../contratos/mercado'
import { carrinhoDo, donoDo, editarBanco, falhar, lerBanco, resetBanco, tokenDe, usuarioDo, type Banco } from './banco'
import { alterarItem, calcularCotacao, criarPedido, encontrarEdicao, mesmaEdicao, quantidadeReservada, validarCupom } from './compras'
import { atualizarPedidos, emitirNft, interromperSockets } from './eventos'
import { base, corpo, resposta, simular } from './http'
import { contaHandlers } from './conta'

const porPagina = 9

function comEstoqueDisponivel(banco: Banco, nft: Nft) {
  return { ...nft, edicoes: nft.edicoes.map(edicao => ({ ...edicao,
    estoque: Math.max(0, edicao.estoque - quantidadeReservada(banco, { nftId: nft.id, edicaoId: edicao.id, quantidade: 1 })),
  })) }
}
export const handlers = [
  ...contaHandlers,
  http.get(base + '/nfts', resposta(async ({ request }) => {
    const banco = await lerBanco()
    const falha = await simular(request, banco.cenario)
    if (falha) return falha
    const params = new URL(request.url).searchParams
    const filtros = buscaCatalogo.parse({ ...Object.fromEntries(params),
      categorias: params.getAll('categorias[]'), redes: params.getAll('redes[]') })
    const normalizar = (valor: string) => valor.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    const busca = normalizar(filtros.busca)
    const itens = banco.cenario === 'vazio' ? [] : banco.nfts.filter(nft => {
      const preco = wei(nft.edicoes[0].preco)
      return (filtros.vitrine === 'todos' || nft.destaque === (filtros.vitrine === 'lancamentos' ? 'Novo' : 'Raro'))
        && normalizar(nft.nome + ' ' + nft.colecao).includes(busca)
        && (!filtros.categorias.length || filtros.categorias.includes(nft.categoria))
        && (!filtros.redes.length || filtros.redes.includes(nft.rede))
        && (!filtros.minimo || preco >= wei(filtros.minimo))
        && (!filtros.maximo || preco <= wei(filtros.maximo))
    })
    if (filtros.ordem !== 'recentes') itens.sort((a, b) => {
      const diferenca = wei(a.edicoes[0].preco) - wei(b.edicoes[0].preco)
      return (diferenca < 0n ? -1 : Number(diferenca > 0n)) * (filtros.ordem === 'menor-preco' ? 1 : -1)
    })
    const inicio = (filtros.pagina - 1) * porPagina
    return { itens: itens.slice(inicio, inicio + porPagina).map(nft => comEstoqueDisponivel(banco, nft)), total: itens.length,
      paginas: Math.max(1, Math.ceil(itens.length / porPagina)), destaques: banco.nfts.slice(0, 3).map(nft => comEstoqueDisponivel(banco, nft)) }
  })),
  http.get(base + '/nfts/:id', resposta(async ({ request, params }) => {
    const banco = await lerBanco()
    const falha = await simular(request, banco.cenario)
    if (falha) return falha
    const nft = banco.nfts.find(nft => nft.id === params.id)
    if (!nft) falhar(404, 'nft-inexistente', 'NFT não encontrado.')
    return comEstoqueDisponivel(banco, nft)
  })),
  http.get(base + '/favoritos', resposta(async ({ request }) => {
    const banco = await lerBanco()
    return HttpResponse.json(banco.contas[usuarioDo(banco, tokenDe(request))!].favoritos)
  })),
  http.put(base + '/favoritos/:id', resposta(async ({ request, params }) => {
    const { ativo } = await corpo(request, z.object({ ativo: z.boolean() }))
    return editarBanco(banco => {
      const conta = banco.contas[usuarioDo(banco, tokenDe(request))!]
      if (banco.cenario === 'favorito-falha') falhar(503, 'favorito-falha', 'Não foi possível salvar o favorito. Tente novamente.')
      const id = String(params.id)
      if (!banco.nfts.some(nft => nft.id === id)) falhar(404, 'nft-inexistente', 'NFT não encontrado.')
      conta.favoritos = ativo ? Array.from(new Set([...conta.favoritos, id])) : conta.favoritos.filter(nftId => nftId !== id)
      return HttpResponse.json(conta.favoritos)
    })
  })),
  http.get(base + '/carrinho', resposta(async ({ request }) => {
    const banco = await lerBanco()
    const falha = await simular(request, banco.cenario)
    if (falha) return falha
    return calcularCotacao(banco, donoDo(banco, request), 'Ethereum')
  })),
  http.post(base + '/carrinho/itens', resposta(async ({ request }) => {
    const dados = await corpo(request, item)
    return editarBanco(banco => {
      const dono = donoDo(banco, request)
      alterarItem(banco, dono, dados, true)
      return calcularCotacao(banco, dono, 'Ethereum')
    })
  })),
  http.put(base + '/carrinho/itens', resposta(async ({ request }) => {
    const dados = await corpo(request, item)
    return editarBanco(banco => {
      const dono = donoDo(banco, request)
      alterarItem(banco, dono, dados, false)
      return calcularCotacao(banco, dono, 'Ethereum')
    })
  })),
  http.delete(base + '/carrinho/itens/:nftId/:edicaoId', resposta(({ request, params }) => editarBanco(banco => {
    const dono = donoDo(banco, request)
    const carrinho = carrinhoDo(banco, dono)
    carrinho.itens = carrinho.itens.filter(item => !mesmaEdicao(item, { nftId: String(params.nftId), edicaoId: String(params.edicaoId), quantidade: 1 }))
    if (!carrinho.itens.length) carrinho.cupom = ''
    return calcularCotacao(banco, dono, 'Ethereum')
  }))),
  http.put(base + '/carrinho/cupom', resposta(async ({ request }) => {
    const { codigo } = await corpo(request, cupom)
    validarCupom(codigo)
    return editarBanco(banco => {
      const dono = donoDo(banco, request)
      carrinhoDo(banco, dono).cupom = codigo
      return calcularCotacao(banco, dono, 'Ethereum')
    })
  })),
  http.get(base + '/cotacao', resposta(async ({ request }) => {
    const banco = await lerBanco()
    const { rede } = cotar.parse(Object.fromEntries(new URL(request.url).searchParams))
    return calcularCotacao(banco, donoDo(banco, request), rede)
  })),
  http.post(base + '/pedidos', resposta(async ({ request }) => {
    const proposta = await corpo(request, pedido)
    const chave = request.headers.get('Idempotency-Key')
    if (!chave || !/^[a-z0-9-]{16,70}$/i.test(chave)) falhar(400, 'chave-invalida', 'A tentativa precisa de um identificador válido.')
    const token = tokenDe(request)
    const resultado = await editarBanco(banco => criarPedido(banco, usuarioDo(banco, token)!, token, chave, proposta))
    if (resultado.criado) {
      const tempo = Math.max(0, resultado.pedido.resolverEm - Date.now())
      setTimeout(() => { void atualizarPedidos() }, tempo)
      if ((await lerBanco()).cenario === 'pedido-timeout') await delay(5000)
    }
    return HttpResponse.json(resultado.pedido, { status: resultado.criado ? 201 : 200 })
  })),
  http.get(base + '/pedidos/pendente', resposta(async ({ request }) => {
    await atualizarPedidos()
    const banco = await lerBanco()
    const id = usuarioDo(banco, tokenDe(request))!
    return HttpResponse.json(Object.values(banco.pedidos).find(pedido => pedido.usuarioId === id && pedido.estado === 'pendente') ?? null)
  })),
  http.get(base + '/pedidos/:id', resposta(async ({ request, params }) => {
    await atualizarPedidos()
    const banco = await lerBanco()
    const id = usuarioDo(banco, tokenDe(request))
    const pedido = banco.pedidos[String(params.id)]
    if (!pedido) falhar(404, 'pedido-inexistente', 'Pedido não encontrado.')
    if (pedido.usuarioId !== id) falhar(403, 'pedido-privado', 'Este pedido pertence a outro colecionador.')
    return pedido
  })),
  http.get(base + '/demo/cenario', resposta(async () => ({ cenario: (await lerBanco()).cenario }))),
  http.put(base + '/demo/cenario', resposta(async ({ request }) => {
    const dados = await corpo(request, z.object({ cenario: z.enum(cenarios), reset: z._default(z.boolean(), false) }))
    if (dados.reset) await resetBanco(dados.cenario)
    else await editarBanco(banco => { banco.cenario = dados.cenario })
    return { cenario: dados.cenario }
  })),
  http.post(base + '/demo/expirar', resposta(({ request }) => editarBanco(banco => {
    const sessao = banco.sessoes[tokenDe(request)]
    if (sessao) sessao.expiraEm = 0
    return HttpResponse.json(null)
  }))),
  http.post(base + '/demo/nft', resposta(async ({ request }) => {
    const dados = await corpo(request, z.object({
      nftId: z.string(), edicaoId: z._default(z.string(), 'colecao'), preco: z.optional(decimal),
      estoque: z.optional(z.int().check(z.minimum(0), z.maximum(999))), repetir: z._default(z.boolean(), false),
    }))
    const versao = await editarBanco(banco => {
      const { nft, edicao } = encontrarEdicao(banco, { ...dados, quantidade: 1 })
      if (!dados.repetir) {
        if (dados.preco !== undefined) edicao.preco = dados.preco
        if (dados.estoque !== undefined) edicao.estoque = dados.estoque
        nft.versao++
      }
      return nft.versao
    })
    emitirNft(dados.nftId, versao)
    if (dados.repetir) emitirNft(dados.nftId, versao - 1)
    return { versao }
  })),
  http.post(base + '/demo/desconectar', resposta(() => {
    interromperSockets()
    return HttpResponse.json(null)
  })),
]
