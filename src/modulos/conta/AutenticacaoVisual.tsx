import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { cache, trocarSessao } from '../../app/consultas'
import { useSessao } from '../../app/contexto'
import { comProps, ocultar, Referencia, type Alterar } from '../../componentes/Referencia'
import { erroDaApi, mercadoApi, salvarToken } from '../../integracoes/api'

export function AutenticacaoVisual({ acao, retorno }: { acao: 'login' | 'cadastro'; retorno: string }) {
  const cadastrar = acao === 'cadastro'
  const [recuperar, setRecuperar] = useState(false)
  const [senhaAberta, setSenhaAberta] = useState<Record<string, boolean>>({})
  const [aviso, setAviso] = useState('')
  const navigate = useNavigate()
  const { avisar } = useSessao()
  const muda = useMutation({
    mutationFn: (dados: Record<string, FormDataEntryValue>) => mercadoApi.autenticar(acao, { ...dados, confirmarSenha: dados.confirmacao }),
    onSuccess: async sessao => {
      await trocarSessao()
      salvarToken(sessao.token)
      cache.setQueryData(['sessao'], sessao)
      avisar(sessao.avisos.join(' '))
      await navigate({ href: retorno, replace: true })
    },
  })
  const tela = recuperar ? 'recuperar' : cadastrar ? 'cadastro' : 'entrar'
  const erro = muda.isError ? erroDaApi(muda.error) : undefined
  const visual: Alterar = (node, props, filhos) => {
    const id = node.attribs.id
    if (id === 'login-modal') return comProps(node, { 'data-tela': tela }, <>{filhos()}
      <button type="button" className="referencia-alternar-login" onClick={() => void navigate({
        to: cadastrar ? '/login' : '/cadastro', search: { retorno },
      })}>{cadastrar ? 'Já tem uma conta? Entre' : 'Novo na Kurio? Crie uma conta'}</button>
    </>)
    if (id?.startsWith('login-painel-')) return comProps(node, ocultar(props, !id.endsWith(tela)), filhos())
    if (id === 'login-apresentacao') return comProps(node, {}, recuperar ? 'Informe seu e-mail para recuperar o acesso à sua conta.'
      : cadastrar ? 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.' : filhos())
    if (node.attribs['data-aba']) {
      const aba = node.attribs['data-aba']
      return comProps(node, { 'data-selecionada': String(tela === aba), 'aria-selected': tela === aba, onClick: () => {
        setRecuperar(false); setAviso(''); muda.reset()
        void navigate({ to: aba === 'cadastro' ? '/cadastro' : '/login', search: { retorno }, replace: true })
      } }, aba === 'cadastro' ? <><span className="cadastro-desktop-texto">{filhos()}</span>
        <span className="cadastro-mobile-texto">Criar perfil de colecionador</span></> : filhos())
    }
    if (id === 'login-fechar') return comProps(node, { onClick: () => void navigate({ to: '/' }) }, filhos())
    if (id === 'login-esqueci' || id === 'login-voltar') return comProps(node, { onClick: () => {
      setAviso(''); muda.reset(); setRecuperar(id === 'login-esqueci')
    } }, filhos())
    if (id === 'login-formulario-entrar' || id === 'login-formulario-cadastro') return comProps(node, {
      noValidate: false, onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); setAviso(''); muda.mutate(Object.fromEntries(new FormData(e.currentTarget)))
      },
    }, filhos())
    if (id === 'login-formulario-recuperar') return comProps(node, { onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault(); setAviso('A recuperação por e-mail está indisponível na demonstração.')
    } }, filhos())
    if (node.attribs['data-provedor']) return comProps(node, { onClick: () => {
      muda.reset(); setAviso('O acesso por ' + node.attribs['data-provedor'] + ' está indisponível na demonstração.')
    } }, filhos())
    if (node.attribs['data-alternar-senha']) {
      const campo = node.attribs['data-alternar-senha']
      return comProps(node, { 'aria-pressed': !!senhaAberta[campo], onClick: () => setSenhaAberta(anterior => ({
        ...anterior, [campo]: !anterior[campo],
      })) }, filhos())
    }
    if (node.name === 'input' && id) {
      const campo = node.attribs.name === 'confirmacao' ? 'confirmarSenha' : node.attribs.name
      const erroCampo = erro?.campos?.[campo]
      const label = campo === 'nome' ? 'Nome de usuário' : campo === 'email' ? 'E-mail' : campo === 'confirmarSenha' ? 'Confirmar senha' : campo === 'senha' ? 'Senha' : undefined
      return comProps(node, { type: senhaAberta[id] ? 'text' : props.type, 'aria-label': label,
        'aria-invalid': !!erroCampo, 'aria-describedby': erroCampo ? 'login-aviso' : undefined })
    }
    if (node.name === 'button' && node.attribs.type === 'submit') {
      const cadastro = node.parent?.type === 'tag' && 'attribs' in node.parent && node.parent.attribs.id === 'login-formulario-cadastro'
      return comProps(node, { disabled: muda.isPending }, cadastro ? <>
        <span className="cadastro-desktop-texto">{filhos()}</span><span className="cadastro-mobile-texto">Criar perfil</span></> : filhos())
    }
    if (id === 'login-aviso') return comProps(node, { ...ocultar(props, !aviso && !erro), role: erro ? 'alert' : 'status' },
      aviso || (erro?.campos ? Object.values(erro.campos).join(' ') : erro?.mensagem ?? ''))
    return undefined
  }
  return <Referencia pagina="login" alterar={visual} extras={<h1 className="sr-only">{cadastrar ? 'Criar perfil de colecionador' : 'Entrar'}</h1>} />
}
