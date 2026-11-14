import { useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { cache, carteirasConsulta } from '../../app/consultas'
import { useSessao } from '../../app/contexto'
import { Button, Erro, Janela, Resumo, Skeleton } from '../../componentes/ui'
import { comProps, modelo, ocultar, Referencia, renderizar, type Alterar } from '../../componentes/Referencia'
import { exibirEth, pedido, provedores, redes, type Conexao, type Cotacao, type PedidoInput, type Rede, type Sessao } from '../../contratos/mercado'
import { erroDaApi, mercadoApi, tokenAtual } from '../../integracoes/api'
import { useCarrinhoMutation } from '../carrinho/estado'
import { guardarTentativa, lerTentativa, type Tentativa } from './tentativa'

const itemVisual = modelo('pagamentos', 'pagamentos-modelo-item').children.find(n => n.type === 'tag')!

export function PagamentoVisual() {
  const { sessao } = useSessao()
  return sessao && <Checkout key={sessao.perfil.id} sessao={sessao} />
}
function Checkout({ sessao }: { sessao: Sessao }) {
  const { avisar } = useSessao()
  const dono = sessao.perfil.id
  const navigate = useNavigate()
  const carteiras = useQuery(carteirasConsulta(dono))
  const [carteiraId, setCarteira] = useState('')
  const [redeEscolhida, setRede] = useState<Rede>()
  const [provedor, setProvedor] = useState<typeof provedores[number]>('Coinbase Wallet')
  const [conexao, setConexao] = useState<Conexao>()
  const [cupom, setCupom] = useState(false)
  const [outra, setOutra] = useState(false)
  const [aviso, setAviso] = useState('')
  const [carteirasAbertas, abrirCarteiras] = useState(false)
  const [revisao, setRevisao] = useState<{ cotacao: Cotacao; proposta: PedidoInput }>()
  const [tentativa, setTentativa] = useState(() => lerTentativa(dono))
  const enviando = useRef(false)
  const carteira = carteiras.data?.find(item => item.id === carteiraId) ?? carteiras.data?.[0]
  const nomeCarteiraCurto = (endereco: string) => endereco.length > 22 ? endereco.slice(0, 7) + '…' + endereco.slice(-4) : endereco
  const rede = redeEscolhida ?? carteira?.rede ?? 'Ethereum'
  const cotacaoKey = ['privado', dono, 'cotacao', rede] as const
  const cotacao = useQuery({ queryKey: cotacaoKey, queryFn: ({ signal }) => mercadoApi.cotacao(rede, signal) })
  const pendente = useQuery({ queryKey: ['privado', dono, 'pendente'], queryFn: ({ signal }) => mercadoApi.pendente(signal) })
  const desconto = useCarrinhoMutation()
  const ligar = useMutation({ mutationFn: mercadoApi.conectar, onSuccess: dados => {
    setConexao(dados); avisar('Carteira conectada.')
  } })
  const desligar = useMutation({ mutationFn: mercadoApi.desconectar, onSuccess: () => setConexao(undefined) })
  const enviar = useMutation({
    mutationFn: (dados: Tentativa) => mercadoApi.iniciarPedido(dados.proposta, dados.chave),
    onSuccess: async (resposta, dados) => {
      if (tokenAtual() !== sessao.token) return
      const registrada = { ...dados, pedidoId: resposta.id }
      guardarTentativa(dono, registrada)
      setTentativa(registrada)
      cache.setQueryData(['privado', dono, 'pedido', resposta.id], resposta)
      await navigate({ to: '/pedidos/$pedidoId', params: { pedidoId: resposta.id } })
    },
    onError: erro => {
      if (tokenAtual() !== sessao.token) return
      const detalhes = erroDaApi(erro)
      if (['rede', 'timeout', 'sessao-invalida'].includes(detalhes.codigo)) return
      guardarTentativa(dono, null); setTentativa(null); setRevisao(undefined)
      if (detalhes.cotacao) cache.setQueryData(['privado', dono, 'cotacao', detalhes.cotacao.rede], detalhes.cotacao)
      if (detalhes.codigo === 'carteira-desconectada') setConexao(undefined)
      void pendente.refetch()
    },
    onSettled: () => { enviando.current = false },
  })
  function confirmar(dados: Tentativa) {
    if (enviando.current) return
    enviando.current = true
    guardarTentativa(dono, dados)
    setTentativa(dados)
    enviar.mutate(dados)
  }
  async function revisar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!cotacao.data?.linhas.length || cotacao.data.problemas.length || tentativa || pendente.data || !carteira) return
    const form = new FormData(e.currentTarget)
    setAviso('')
    const endereco = String(outra ? form.get('carteiraExtra') : form.get('carteiraEndereco'))
    if (endereco.trim().toLowerCase() !== carteira.endereco.toLowerCase() || carteira.rede !== rede) {
      setAviso('Escolha uma carteira cadastrada compatível com o endereço e a rede informados.')
      return
    }
    try {
      const conectada = conexao ?? await ligar.mutateAsync({ carteiraId: carteira.id, rede, provedor })
      const proposta = pedido.parse({ cotacaoId: cotacao.data.id, conexaoId: conectada.id, rede,
        coletor: { nome: form.get('nomeExibicao'), email: form.get('email'), usuario: form.get('usuario'),
          nomePerfil: form.get('nomePerfil'), indicacao: form.get('indicacao'), ens: form.get('ens'),
          observacao: form.get('observacao') || undefined } })
      setRevisao({ cotacao: cotacao.data, proposta })
      enviar.reset()
    } catch (erro) {
      if (erro instanceof Error && erro.name === 'ZodError') setAviso('Revise os dados do perfil do colecionador.')
    }
  }
  const atual = cotacao.data
  const antiga = !!revisao && revisao.cotacao.id !== atual?.id
  const conta = sessao.perfil
  const valores: Record<string, unknown> = {
    nomeExibicao: conta.nome, usuario: conta.usuario ?? conta.email.split('@')[0], nomePerfil: conta.nome,
    carteiraEndereco: carteira?.endereco, carteiraSecundaria: carteiras.data?.find(item => item.tipo === 'secundaria')?.endereco,
    indicacao: 'KURIO', email: conta.email, ens: conta.nomeEns ?? conta.email.split('@')[0],
  }
  const totais: Record<string, string> = {
    'pagamentos-subtotal': exibirEth(atual?.subtotal ?? '0'), 'pagamentos-desconto': '(-) ' + exibirEth(atual?.desconto ?? '0'),
    'pagamentos-taxa': exibirEth(atual?.taxa ?? '0'), 'pagamentos-total': exibirEth(atual?.total ?? '0'),
  }
  const visual: Alterar = (node, props, filhos) => {
    const id = node.attribs.id
    const nome = node.attribs.name
    if (id === 'pagina-pagamentos') return comProps(node, {}, <>
      <header className="referencia-titulo-fluxo"><Link to="/carrinho" aria-label="Voltar ao carrinho">‹</Link><h1>Pagamento com carteira</h1></header>
      <div className="checkout-mobile-carteiras">
        <div className="checkout-mobile-titulo"><h2>Carteira conectada</h2>
          <button type="button" onClick={() => abrirCarteiras(true)}>Trocar carteira</button>
        </div>
        <fieldset aria-label="Carteiras cadastradas">
          {[...(carteiras.data ?? [])].reverse().map(item => <label key={item.id}>
            <input type="radio" name="escolher-carteira-mobile" checked={carteira?.id === item.id}
              onChange={() => {
                if (conexao) desligar.mutate(conexao.id)
                setCarteira(item.id); setRede(item.rede)
              }} />
            <span><strong>{item.nome}</strong><small title={item.endereco}>{nomeCarteiraCurto(item.endereco)}</small>
              <small>Rede {item.rede}</small></span>
            <span className="ml-auto self-center" aria-hidden="true">⋮</span>
          </label>)}
        </fieldset>
        {carteiras.isSuccess && !carteira && <Link to="/conta/carteiras">Cadastre uma carteira</Link>}
      </div>
      {filhos()}
      <div className="checkout-gerenciar-carteira">
        <button type="button" onClick={() => abrirCarteiras(true)}>Trocar carteira</button>
        {conexao && <button type="button" onClick={() => desligar.mutate(conexao.id)}>Desconectar carteira</button>}
      </div>
    </>)
    if (id && Object.hasOwn(totais, id)) return comProps(node, {}, totais[id])
    if (id === 'pagamentos-formulario') return comProps(node, { noValidate: false, onSubmit: (e: React.FormEvent<HTMLFormElement>) => void revisar(e),
      key: carteira?.id ?? 'perfil' }, filhos())
    if (node.name === 'input' && nome && Object.hasOwn(valores, nome)) return comProps(node, { defaultValue: valores[nome] })
    if (id === 'pagamentos-rede') return comProps(node, { value: rede, disabled: !!conexao, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
      const nova = redes.find(item => item === e.target.value)
      if (!nova) return
      const compativel = carteiras.data?.find(item => item.rede === nova)
      if (compativel) setCarteira(compativel.id)
      setRede(nova)
    } }, filhos())
    if (id === 'pagamentos-carteira-tipo') return comProps(node, { value: provedor, disabled: !!conexao, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selecionado = provedores.find(item => item === e.target.value)
      if (selecionado) setProvedor(selecionado)
    } }, filhos())
    if (id === 'pagamentos-outra-carteira') return comProps(node, { checked: outra, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setOutra(e.target.checked) })
    if (id === 'pagamentos-carteira-extra-bloco') return comProps(node, ocultar(props, !outra), filhos())
    if (id === 'pagamentos-carteira-extra') return comProps(node, { name: 'carteiraExtra', required: outra, disabled: !outra })
    if (id === 'pagamentos-itens') return comProps(node, {}, <>
      {cotacao.isPending && <Skeleton className="h-24" />}
      {atual?.linhas.map(linha => <div key={linha.nftId + linha.edicaoId}>{renderizar(itemVisual, (n) => {
        const a = n.attribs
        if ('data-pagamentos-link' in a) return <Link className={a.class} to="/nfts/$nftId" params={{ nftId: linha.nftId }}>
          <img src={linha.imagem} alt={linha.nome} className="h-[55px] w-[55px] shrink-0 rounded-[5px] object-cover max-[420px]:h-[48px] max-[420px]:w-[48px]" />
          <span className="min-w-0"><strong className="block truncate text-[11px] font-bold">{linha.nome}</strong>
            <small className="mt-1 block text-[9px] text-kurio-secundaria">Edição {linha.edicao}</small></span></Link>
        if ('data-pagamentos-imagem' in a) return comProps(n, { src: linha.imagem, alt: linha.nome })
        if ('data-pagamentos-nome' in a) return comProps(n, {}, linha.nome)
        if ('data-pagamentos-token' in a || 'data-pagamentos-edicao' in a) return comProps(n, {}, `Edição: ${linha.edicao} · Qtd. ${linha.quantidade}`)
        if ('data-pagamentos-quantidade' in a) return comProps(n, {}, '(x ' + linha.quantidade + ')')
        if ('data-pagamentos-valor' in a) return comProps(n, {}, exibirEth(linha.total))
        return undefined
      })}</div>)}
    </>)
    if (id === 'pagamentos-sem-itens') return comProps(node, ocultar(props, !atual || !!atual.linhas.length), filhos())
    if (id === 'pagamentos-abrir-cupom') return comProps(node, { onClick: () => setCupom(!cupom), 'aria-expanded': cupom }, filhos())
    if (id === 'pagamentos-formulario-cupom') {
      const oculto = ocultar(props, !cupom)
      return comProps(node, { ...oculto, className: oculto.className + (cupom ? ' flex' : ''),
        onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
          e.preventDefault(); desconto.mutate({ acao: 'cupom', codigo: String(new FormData(e.currentTarget).get('codigo')) })
        } }, filhos())
    }
    if (id === 'pagamentos-cupom') return comProps(node, { name: 'codigo', defaultValue: atual?.cupom ?? '' })
    if (id === 'pagamentos-mensagem-cupom') return comProps(node, {}, desconto.error ? erroDaApi(desconto.error).mensagem : atual?.cupom ? 'Cupom ' + atual.cupom + ' aplicado.' : '')
    if (nome === 'pagamentos-radio-carteira') return comProps(node, { defaultChecked: undefined, checked: provedor === node.attribs.value,
      disabled: !!conexao, onChange: () => setProvedor(node.attribs.value as typeof provedores[number]) })
    if (node.name === 'label' && node.children.some(filho => filho.type === 'tag' && 'attribs' in filho
      && filho.attribs.name === 'pagamentos-radio-carteira')) {
      const radio = node.children.find(filho => filho.type === 'tag' && 'attribs' in filho && filho.attribs.name === 'pagamentos-radio-carteira')
      const marca = radio && 'attribs' in radio ? radio.attribs.value : ''
      return comProps(node, {}, <><span className="checkout-mobile-provedor" aria-hidden="true">{marca === 'Coinbase Wallet' ? '◉' : marca[0]}</span>
        <span className="checkout-mobile-provedor-nome">{marca}</span><span className="checkout-desktop-provedor">{filhos()}</span>
        <input className="checkout-mobile-radio" type="radio" aria-label={marca} name="provedor-mobile" checked={provedor === marca}
          onChange={() => setProvedor(marca as typeof provedores[number])} /></>)
    }
    if (id === 'pagamentos-titulo-perfil') return comProps(node, { className: props.className + ' checkout-desktop-perfil-titulo' }, filhos())
    if (id === 'pagamentos-titulo-resumo') return comProps(node, { className: props.className + ' checkout-desktop-resumo-titulo' }, filhos())
    if (id === 'pagamentos-abrir-cupom') return comProps(node, { onClick: () => setCupom(!cupom), 'aria-expanded': cupom }, filhos())

    if (id === 'pagamentos-confirmar') return comProps(node, { disabled: !atual?.linhas.length || !!atual.problemas.length ||
      !carteira || ligar.isPending || !!tentativa || !!pendente.data }, filhos())
    if (id === 'pagamentos-retorno') {
      const mensagem = aviso || atual?.problemas.join(' ') || (ligar.error ? erroDaApi(ligar.error).mensagem : '')
      return comProps(node, ocultar(props, !mensagem), mensagem)
    }
    if (id === 'pagamentos-ver-demo') return <></>
    return undefined
  }
  return <Referencia pagina="pagamentos" alterar={visual} extras={<>
    <div className="mx-auto max-w-[1200px] px-8">
      <Erro erro={enviar.error || pendente.error || cotacao.error || carteiras.error} />
      {tentativa?.pedidoId ? <Link className="link" to="/pedidos/$pedidoId" params={{ pedidoId: tentativa.pedidoId }}>Acompanhar pedido</Link>
        : tentativa && !enviar.isPending && <Button onClick={() => confirmar(tentativa)}>Consultar ou reenviar tentativa</Button>}
      {pendente.data && !tentativa?.pedidoId && <Link className="link" to="/pedidos/$pedidoId" params={{ pedidoId: pendente.data.id }}>Abrir pedido pendente</Link>}
      {!carteira && carteiras.isSuccess && <Link className="link" to="/conta/carteiras">Cadastre uma carteira para continuar</Link>}
    </div>
    <Janela titulo="Carteiras cadastradas" descricao="Escolha a carteira que receberá os NFTs." aberta={carteirasAbertas} aoMudar={abrirCarteiras}>
      {carteiras.data?.map(item => <Button className="my-2 block w-full" variant="outline" key={item.id} onClick={() => {
        if (conexao) desligar.mutate(conexao.id)
        setCarteira(item.id); setRede(item.rede); abrirCarteiras(false)
      }}>{item.nome} · {item.rede}</Button>)}
      <Link className="link" to="/conta/carteiras">Gerenciar carteiras</Link>
    </Janela>
    <Janela titulo="Revisar compra" descricao="Confira os itens e valores da cotação." aberta={!!revisao}
      aoMudar={aberta => { if (!aberta && !enviar.isPending) setRevisao(undefined) }}>
      {revisao && <>
        <ul className="mb-4">{revisao.cotacao.linhas.map(linha => <li key={linha.nftId + linha.edicaoId}>{linha.quantidade} × {linha.nome}</li>)}</ul>
        <Resumo cotacao={revisao.cotacao} />
        {antiga && <p role="alert" className="aviso-erro">A cotação mudou. Feche e revise os valores atualizados.</p>}
        <Erro erro={enviar.error} />
        <Button disabled={antiga || enviar.isPending || cotacao.isFetching} onClick={() => confirmar(tentativa ?? { chave: crypto.randomUUID(), proposta: revisao.proposta })}>Confirmar compra</Button>
      </>}
    </Janela>
  </>} />
}
