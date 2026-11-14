import { z } from 'zod'

export const categorias = ['Arte 3D', 'Colecionáveis', 'Generativa', 'Jogos', 'Assinaturas', 'Utilidade', 'Arte digital', 'Fotografia', 'Música'] as const
export const redes = ['Ethereum', 'Polygon', 'Solana'] as const
export const provedores = ['WalletConnect', 'MetaMask', 'Coinbase Wallet'] as const
export const cenarios = ['padrao', 'vazio', 'lento', 'fora-de-ordem', 'sem-rede', 'erro-http', 'favorito-falha',
  'carteira-recusada', 'pagamento-recusado', 'pedido-timeout', 'pedido-pendente'] as const
export type Cenario = typeof cenarios[number]
export type Rede = typeof redes[number]
export type Eth = string

export const decimal = z.string().regex(/^\d{1,12}(\.\d{1,18})?$/)
const filtroPreco = z.union([z.literal(''), decimal])
export const buscaCatalogo = z.object({
  busca: z.string().trim().max(100).catch(''),
  categorias: z.array(z.enum(categorias)).catch([]),
  redes: z.array(z.enum(redes)).catch([]),
  minimo: filtroPreco.catch(''),
  maximo: filtroPreco.catch(''),
  vitrine: z.enum(['todos', 'lancamentos', 'em-alta']).catch('todos'),
  ordem: z.enum(['recentes', 'menor-preco', 'maior-preco']).catch('recentes'),
  pagina: z.coerce.number().int().min(1).max(10000).catch(1),
})
export type BuscaCatalogo = z.infer<typeof buscaCatalogo>
export type Edicao = { id: string; nome: string; preco: Eth; estoque: number }
export type Nft = {
  id: string; nome: string; categoria: typeof categorias[number]; rede: Rede; colecao: string
  descricao: string; imagens: string[]; atributos: string[]; token: string
  edicoes: Edicao[]; versao: number; destaque?: string
}
export type Catalogo = { itens: Nft[]; total: number; paginas: number; destaques: Nft[] }

const nome = z.string().trim().min(2, 'Informe ao menos dois caracteres.').max(100)
const email = z.email('Informe um e-mail válido.').trim().toLowerCase().max(254)
const senha = z.string().min(8, 'Use pelo menos oito caracteres.').max(128)
export const login = z.object({ email, senha: z.string().min(1, 'Informe sua senha.').max(128) })
export const cadastro = z.object({ nome, email, senha, confirmarSenha: z.string() })
  .refine(v => v.senha === v.confirmarSenha, { path: ['confirmarSenha'], message: 'As senhas precisam ser iguais.' })
export const perfil = z.object({
  nome, email, usuario: z.string().trim().min(3).max(80).optional(),
  nomeEns: z.string().trim().min(1).max(100).optional(), apelidoCarteira: z.string().trim().min(2).max(100).optional(),
  biografia: z.string().max(350).default(''),
  avatar: z.string().max(400_000).refine(v => !v || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(v), 'Use uma imagem PNG, JPEG ou WebP.'),
})
export const trocarSenha = z.object({ atual: z.string().min(1, 'Informe a senha atual.'), senha, confirmarSenha: z.string() })
  .refine(v => v.senha === v.confirmarSenha, { path: ['confirmarSenha'], message: 'As senhas precisam ser iguais.' })
export const carteira = z.object({
  nome, endereco: z.string().trim().min(3, 'Informe o endereço da carteira.'),
  rede: z.enum(redes), tipo: z.enum(['principal', 'secundaria']),
}).refine(v => v.rede === 'Solana'
  ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v.endereco)
  : /^(0x[0-9a-fA-F]{40}|[a-z0-9][a-z0-9.-]*\.eth)$/i.test(v.endereco),
{ path: ['endereco'], message: 'Informe um endereço válido para a rede selecionada.' })
export const conexao = z.object({ carteiraId: z.string().min(1), rede: z.enum(redes), provedor: z.enum(provedores) })
export const item = z.object({ nftId: z.string().min(1), edicaoId: z.string().min(1), quantidade: z.number().int().min(1).max(999) })
export const cupom = z.object({ codigo: z.string().trim().max(40).transform(v => v.toUpperCase()) })
export const cotar = z.object({ rede: z.enum(redes).default('Ethereum') })
export const pedido = z.object({
  cotacaoId: z.string().min(1), conexaoId: z.string().min(1), rede: z.enum(redes),
  coletor: z.object({ nome, email, usuario: z.string().trim().min(3).max(80).optional(),
    nomePerfil: z.string().trim().min(2).max(100).optional(),
    indicacao: z.string().trim().min(1).max(60).optional(),
    ens: z.string().trim().min(1).max(100).optional(), observacao: z.string().max(1000).optional() }),
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
