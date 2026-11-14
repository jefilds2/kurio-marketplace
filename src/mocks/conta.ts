import { http, HttpResponse } from 'msw'
import { cadastro, carteira, conexao, login, perfil, trocarSenha } from '../contratos/mercado'
import { carrinhoDo, editarBanco, falhar, lerBanco, tokenDe, usuarioDo, verificarSenha, type Banco } from './banco'
import { encontrarEdicao, mesmaEdicao, quantidadeReservada } from './compras'
import { base, corpo, resposta, simular } from './http'

function novaSessao(banco: Banco, usuarioId: string, request: Request) {
  const token = crypto.randomUUID()
  const expiraEm = Date.now() + 2 * 60 * 60 * 1000
  banco.sessoes[token] = { usuarioId, expiraEm }
  const visitante = request.headers.get('x-kurio-visitante')
  const avisos: string[] = []
  if (visitante) {
    const origem = 'visitante:' + visitante
    const carrinho = carrinhoDo(banco, origem)
    const destino = carrinhoDo(banco, usuarioId)
    for (const linha of carrinho.itens) {
      const anterior = destino.itens.find(item => mesmaEdicao(item, linha))
      const quantidade = linha.quantidade + (anterior?.quantidade ?? 0)
      if (anterior) anterior.quantidade = quantidade
      else destino.itens.push({ ...linha })
      const { edicao } = encontrarEdicao(banco, linha)
      if (quantidade > edicao.estoque - quantidadeReservada(banco, linha)) {
        avisos.push('Ajuste a quantidade dos itens que ficaram indisponíveis no carrinho.')
      }
    }
    if (!destino.cupom && carrinho.cupom) destino.cupom = carrinho.cupom
    delete banco.carrinhos[origem]
  }
  return { token, perfil: banco.contas[usuarioId].perfil, expiraEm, avisos }
}
function emailDisponivel(banco: Banco, email: string, id?: string) {
  if (Object.values(banco.contas).some(conta => conta.perfil.email === email && conta.perfil.id !== id)) {
    falhar(409, 'email-em-uso', 'Este e-mail já tem uma conta.', { campos: { email: 'E-mail já cadastrado.' } })
  }
}

export const contaHandlers = [
  http.post(base + '/sessao/cadastro', resposta(async ({ request }) => {
    const falha = await simular(request)
    if (falha) return falha
    const { nome, email, senha } = await corpo(request, cadastro)
    const salt = crypto.randomUUID()
    const verificador = await verificarSenha(senha, salt)
    return editarBanco(banco => {
      emailDisponivel(banco, email)
      const id = crypto.randomUUID()
      banco.contas[id] = { perfil: { id, nome, email, avatar: '', biografia: '' }, salt, verificador, favoritos: [], carteiras: [] }
      return novaSessao(banco, id, request)
    })
  })),
  http.post(base + '/sessao/login', resposta(async ({ request }) => {
    const falha = await simular(request)
    if (falha) return falha
    const { email, senha } = await corpo(request, login)
    const conta = Object.values((await lerBanco()).contas).find(conta => conta.perfil.email === email)
    if (!conta || await verificarSenha(senha, conta.salt) !== conta.verificador) {
      falhar(422, 'credenciais', 'E-mail ou senha inválidos.', { campos: { senha: 'Confira seu e-mail e sua senha.' } })
    }
    return editarBanco(banco => {
      if (banco.contas[conta.perfil.id]?.verificador !== conta.verificador) falhar(422, 'credenciais', 'Tente entrar novamente.')
      return novaSessao(banco, conta.perfil.id, request)
    })
  })),
  http.get(base + '/sessao', resposta(async ({ request }) => {
    const banco = await lerBanco()
    const token = tokenDe(request)
    if (!token) return HttpResponse.json(null)
    const id = usuarioDo(banco, token)!
    return { token, perfil: banco.contas[id].perfil, expiraEm: banco.sessoes[token].expiraEm, avisos: [] }
  })),
  http.delete(base + '/sessao', resposta(({ request }) => editarBanco(banco => {
    const token = tokenDe(request)
    delete banco.sessoes[token]
    for (const [id, conexao] of Object.entries(banco.conexoes)) if (conexao.token === token) delete banco.conexoes[id]
    return HttpResponse.json(null)
  }))),
  http.get(base + '/perfil', resposta(async ({ request }) => {
    const banco = await lerBanco()
    return banco.contas[usuarioDo(banco, tokenDe(request))!].perfil
  })),
  http.put(base + '/perfil', resposta(async ({ request }) => {
    const dados = await corpo(request, perfil)
    return editarBanco(banco => {
      const id = usuarioDo(banco, tokenDe(request))!
      emailDisponivel(banco, dados.email, id)
      return banco.contas[id].perfil = { ...dados, id }
    })
  })),
  http.put(base + '/perfil/senha', resposta(async ({ request }) => {
    const dados = await corpo(request, trocarSenha)
    const banco = await lerBanco()
    const id = usuarioDo(banco, tokenDe(request))!
    const conta = banco.contas[id]
    if (await verificarSenha(dados.atual, conta.salt) !== conta.verificador) {
      falhar(422, 'senha-atual', 'A senha atual está incorreta.', { campos: { atual: 'Senha atual incorreta.' } })
    }
    const salt = crypto.randomUUID()
    const verificador = await verificarSenha(dados.senha, salt)
    return editarBanco(banco => {
      const atual = banco.contas[usuarioDo(banco, tokenDe(request))!]
      if (atual.verificador !== conta.verificador) falhar(409, 'senha-alterada', 'A senha foi alterada. Revise e tente novamente.')
      atual.salt = salt
      atual.verificador = verificador
      return HttpResponse.json(null)
    })
  })),
  http.get(base + '/carteiras', resposta(async ({ request }) => {
    const banco = await lerBanco()
    return HttpResponse.json(banco.contas[usuarioDo(banco, tokenDe(request))!].carteiras)
  })),
  http.put(base + '/carteiras/:tipo', resposta(async ({ request, params }) => {
    const dados = await corpo(request, carteira)
    if (params.tipo !== dados.tipo) falhar(422, 'carteira-invalida', 'O tipo da carteira não corresponde à solicitação.')
    return editarBanco(banco => {
      const id = usuarioDo(banco, tokenDe(request))!
      const lista = banco.contas[id].carteiras
      const existente = lista.find(carteira => carteira.tipo === dados.tipo)
      const nova = { ...dados, id: existente?.id ?? crypto.randomUUID() }
      if (existente) {
        Object.assign(existente, nova)
        for (const [id, conexao] of Object.entries(banco.conexoes)) if (conexao.carteiraId === existente.id) delete banco.conexoes[id]
      } else lista.push(nova)
      return nova
    })
  })),
  http.post(base + '/carteiras/conexao', resposta(async ({ request }) => {
    const dados = await corpo(request, conexao)
    return editarBanco(banco => {
      const token = tokenDe(request)
      const id = usuarioDo(banco, token)!
      if (!banco.contas[id].carteiras.some(carteira => carteira.id === dados.carteiraId && carteira.rede === dados.rede)) {
        falhar(422, 'rede-invalida', 'A carteira selecionada não está configurada nesta rede.')
      }
      if (banco.cenario === 'carteira-recusada') falhar(409, 'conexao-recusada', 'A conexão com a carteira foi recusada.')
      const nova = { ...dados, id: crypto.randomUUID() }
      banco.conexoes[nova.id] = { ...nova, token }
      return nova
    })
  })),
  http.delete(base + '/carteiras/conexao/:id', resposta(({ request, params }) => editarBanco(banco => {
    const token = tokenDe(request)
    usuarioDo(banco, token)
    const id = String(params.id)
    if (banco.conexoes[id]?.token === token) delete banco.conexoes[id]
    return HttpResponse.json(null)
  }))),
]
