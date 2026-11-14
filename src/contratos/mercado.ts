import { z } from 'zod/mini'

export const categorias = ['Arte 3D', 'Colecionáveis', 'Generativa', 'Jogos', 'Assinaturas', 'Utilidade', 'Arte digital', 'Fotografia', 'Música'] as const
export const redes = ['Ethereum', 'Polygon', 'Solana'] as const
export const provedores = ['WalletConnect', 'MetaMask', 'Coinbase Wallet'] as const
export const cenarios = ['padrao', 'vazio', 'lento', 'fora-de-ordem', 'sem-rede', 'erro-http', 'favorito-falha',
  'carteira-recusada', 'pagamento-recusado', 'pedido-timeout', 'pedido-pendente'] as const
export type Cenario = typeof cenarios[number]
export type Rede = typeof redes[number]
export type Eth = string

export const decimal = z.string().check(z.regex(/^\d{1,12}(\.\d{1,18})?$/))
const filtroPreco = z.union([z.literal(''), decimal])
export const buscaCatalogo = z.object({
  busca: z.catch(z.string().check(z.trim(), z.maxLength(100)), ''),
  categorias: z.catch(z.array(z.enum(categorias)), []),
  redes: z.catch(z.array(z.enum(redes)), []),
  minimo: z.catch(filtroPreco, ''),
  maximo: z.catch(filtroPreco, ''),
  vitrine: z.catch(z.enum(['todos', 'lancamentos', 'em-alta']), 'todos'),
  ordem: z.catch(z.enum(['recentes', 'menor-preco', 'maior-preco']), 'recentes'),
  pagina: z.catch(z.coerce.number().check(z.int(), z.minimum(1), z.maximum(10000)), 1),
})
export type BuscaCatalogo = z.infer<typeof buscaCatalogo>
export type Edicao = { id: string; nome: string; preco: Eth; estoque: number }
export type Nft = {
  id: string; nome: string; categoria: typeof categorias[number]; rede: Rede; colecao: string
  descricao: string; imagens: string[]; atributos: string[]; token: string
  edicoes: Edicao[]; versao: number; destaque?: string
}
export type Catalogo = { itens: Nft[]; total: number; paginas: number; destaques: Nft[] }

const nome = z.string().check(z.trim(), z.minLength(2, 'Informe ao menos dois caracteres.'), z.maxLength(100))
const email = z.email('Informe um e-mail válido.').check(z.trim(), z.toLowerCase(), z.maxLength(254))
const senha = z.string().check(z.minLength(8, 'Use pelo menos oito caracteres.'), z.maxLength(128))
const senhasIguais = z.refine<{ senha: string; confirmarSenha: string }>(dados => dados.senha === dados.confirmarSenha,
  { path: ['confirmarSenha'], message: 'As senhas precisam ser iguais.' })

export const login = z.object({ email, senha: z.string().check(z.minLength(1, 'Informe sua senha.'), z.maxLength(128)) })
export const cadastro = z.object({ nome, email, senha, confirmarSenha: z.string() }).check(senhasIguais)
export const perfil = z.object({
  nome, email, usuario: z.optional(z.string().check(z.trim(), z.minLength(3), z.maxLength(80))),
  nomeEns: z.optional(z.string().check(z.trim(), z.minLength(1), z.maxLength(100))),
  apelidoCarteira: z.optional(z.string().check(z.trim(), z.minLength(2), z.maxLength(100))),
  biografia: z._default(z.string().check(z.maxLength(350)), ''),
  avatar: z.string().check(z.maxLength(400_000),
    z.refine(v => !v || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(v), 'Use uma imagem PNG, JPEG ou WebP.')),
})
export const trocarSenha = z.object({
  atual: z.string().check(z.minLength(1, 'Informe a senha atual.')), senha, confirmarSenha: z.string(),
}).check(senhasIguais)
export const carteira = z.object({
  nome, endereco: z.string().check(z.trim(), z.minLength(3, 'Informe o endereço da carteira.')),
  rede: z.enum(redes), tipo: z.enum(['principal', 'secundaria']),
}).check(z.refine(v => v.rede === 'Solana'
  ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v.endereco)
  : /^(0x[0-9a-fA-F]{40}|[a-z0-9][a-z0-9.-]*\.eth)$/i.test(v.endereco),
{ path: ['endereco'], message: 'Informe um endereço válido para a rede selecionada.' }))
const identificador = z.string().check(z.minLength(1))
export const conexao = z.object({ carteiraId: identificador, rede: z.enum(redes), provedor: z.enum(provedores) })
export const item = z.object({ nftId: identificador, edicaoId: identificador, quantidade: z.int().check(z.minimum(1), z.maximum(999)) })
export const cupom = z.object({ codigo: z.string().check(z.trim(), z.maxLength(40), z.toUpperCase()) })
export const cotar = z.object({ rede: z._default(z.enum(redes), 'Ethereum') })
export const pedido = z.object({
  cotacaoId: identificador, conexaoId: identificador, rede: z.enum(redes),
  coletor: z.object({
    nome, email, usuario: z.optional(z.string().check(z.trim(), z.minLength(3), z.maxLength(80))),
    nomePerfil: z.optional(z.string().check(z.trim(), z.minLength(2), z.maxLength(100))),
    indicacao: z.optional(z.string().check(z.trim(), z.minLength(1), z.maxLength(60))),
    ens: z.optional(z.string().check(z.trim(), z.minLength(1), z.maxLength(100))),
    observacao: z.optional(z.string().check(z.maxLength(1000))),
  }),
})
export type Perfil = z.infer<typeof perfil> & { id: string }
export type Sessao = { token: string; perfil: Perfil; expiraEm: number; avisos: string[] }
export type Carteira = z.infer<typeof carteira> & { id: string }
export type Conexao = z.infer<typeof conexao> & { id: string }
export type Item = z.infer<typeof item>
export type Linha = Item & {
  nome: string; edicao: string; imagem: string; preco: Eth; total: Eth; estoque: number; versao: number
}
export type Cotacao = {
  id: string; rede: Rede; linhas: Linha[]; subtotal: Eth; desconto: Eth; taxa: Eth; total: Eth
  cupom: string; problemas: string[]
}
export type PedidoInput = z.infer<typeof pedido>
export type EstadoPedido = 'pendente' | 'confirmado' | 'recusado'
export type Pedido = {
  id: string; usuarioId: string; cotacao: Cotacao; coletor: PedidoInput['coletor']; carteira: Carteira
  estado: EstadoPedido; versao: number; criadoEm: number; resolverEm: number; transacao?: string
}
export type ApiErro = { codigo: string; mensagem: string; campos?: Record<string, string>; cotacao?: Cotacao }
export type Evento = { id: string; recursoId: string; versao: number }
export type EventoNft = Evento
export type EventoPedido = Evento & { usuarioId: string; estado: EstadoPedido }

const escala = 10n ** 18n
export function wei(valor: Eth) {
  const [inteiro, fracao = ''] = valor.split('.')
  return BigInt(inteiro) * escala + BigInt(fracao.padEnd(18, '0'))
}
export function eth(valor: bigint): Eth {
  const fracao = (valor % escala).toString().padStart(18, '0').replace(/0+$/, '')
  return fracao ? `${valor / escala}.${fracao}` : String(valor / escala)
}
export function exibirEth(valor: Eth) {
  return `${valor} ETH`
}
