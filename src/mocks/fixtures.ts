import { categorias, redes, type Carteira, type Nft, type Perfil } from '../contratos/mercado'

const obras = [
  ['Emerald Ape #042', '1.19', 1, '0042', 'Raro'],
  ['Sage Nomad #009', '1.69', 2, '0009', ''],
  ['Neon Vessel #552', '1.99', 3, '0552', ''],
  ['Cosmic Bloom #118', '1.29', 2, '0118', 'Novo'],
  ['Violet Nomad #314', '1.39', 2, '0314', ''],
  ['Ivory Baron #088', '1.79', 3, '0088', 'Raro'],
  ['Golden Beat #207', '0.99', 4, '0207', ''],
  ['Golden Collection #101', '0.79', 4, '0101', ''],
  ['Golden Signal #160', '0.39', 4, '0160', ''],
  ['Forest Duke #032', '0.48', 1, '0032', 'Novo'],
  ['Ivory Vessel #098', '1.45', 3, '0098', ''],
  ['Amber Nomad #112', '0.75', 4, '0112', ''],
  ['Jade Rider #019', '1.51', 1, '0019', ''],
  ['Violet Regent #241', '2.12', 2, '0241', ''],
  ['Ivory Signal #255', '0.87', 3, '0255', ''],
  ['Amber Spirit #765', '0.62', 4, '0765', ''],
  ['Green Duke #998', '1.32', 1, '0998', ''],
  ['Sage Vessel #517', '1.91', 2, '0517', ''],
  ['Golden Halo #052', '0.53', 4, '0052', ''],
  ['Emerald Foundry #182', '1.92', 1, '0182', ''],
] as const

const imagem = (numero: number) => `/images/primeape${numero}.webp`
export function criarNfts(): Nft[] {
  return obras.map(([nome, preco, numero, token, destaque], i) => ({
    id: `nft-${String(i + 1).padStart(2, '0')}`, nome, token: '#' + token, destaque,
    categoria: i === 0 ? 'Colecionáveis' : categorias[i % categorias.length],
    rede: redes[i % redes.length], colecao: 'Kurio Apes', atributos: ['Óculos', 'Esmeralda', destaque || 'Edição digital'],
    descricao: `Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na rede ${redes[i % redes.length]}.`,
    imagens: [numero, ...[1, 2, 3, 4].filter(n => n !== numero)].map(imagem),
    edicoes: [
      { id: 'colecao', nome: '1/50', preco, estoque: 4 + i % 3 },
      { id: 'unica', nome: '1/1', preco: '3.25', estoque: 1 },
      { id: 'limitada', nome: '1/10', preco: '2.29', estoque: i % 3 === 0 ? 0 : 2 },
      { id: 'aberta', nome: 'Aberta', preco: '0.65', estoque: 12 },
    ], versao: 1,
  }))
}
// Contas públicas de demonstração, com PBKDF2 da senha de teste Kurio123! e salt kurio-demo-{id}.
export const demo = [
  { perfil: { id: 'ana', nome: 'Ana Souza', email: 'ana@kurio.test', biografia: '', avatar: '' },
    verificador: 'b0bc10b60758577ca4b3e221a9b967cece6296b474823098dff1a8d9014fc668' },
  { perfil: { id: 'leo', nome: 'Leo Costa', email: 'leo@kurio.test', biografia: '', avatar: '' },
    verificador: '3a45c6b4de33ebeae4c8464707d1eeafc09efeb64d1ab3d08e42a3e89ea97dfa' },
] satisfies { perfil: Perfil; verificador: string }[]
export function carteirasIniciais(id: string): Carteira[] {
  return [
    { id: `${id}-principal`, nome: 'Principal', endereco: '0x' + (id === 'ana' ? 'a' : 'b').repeat(40), rede: 'Ethereum', tipo: 'principal' },
    { id: `${id}-reserva`, nome: 'Reserva', endereco: `${id}.kurio.eth`, rede: 'Polygon', tipo: 'secundaria' },
  ]
}
