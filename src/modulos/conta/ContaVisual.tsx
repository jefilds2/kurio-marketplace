import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { cache, carteirasConsulta, perfilConsulta } from '../../app/consultas'
import { useSessao } from '../../app/contexto'
import { comProps, definirReferencia, ocultar, Referencia, type Alterar } from '../../componentes/Referencia'
import { erroDaApi, mercadoApi } from '../../integracoes/api'
import type { Carteira } from '../../contratos/mercado'
import html from '../../referencias/minha-conta.html?raw'

const pagina = definirReferencia('conta', html)

export function ContaVisual({ carteiras = false }: { carteiras?: boolean }) {
  const { sessao, avisar } = useSessao()
  const dono = sessao?.perfil.id ?? ''
  const navigate = useNavigate()
  const perfil = useQuery(perfilConsulta(dono))
  const consulta = useQuery(carteirasConsulta(dono))
  const principal = consulta.data?.find(item => item.tipo === 'principal')
  const secundaria = consulta.data?.find(item => item.tipo === 'secundaria')
  const [mostrarSecundaria, setMostrarSecundaria] = useState(false)
  const [avatarLocal, setAvatar] = useState<string>()
  const [erroAvatar, setErroAvatar] = useState('')
  const [visivel, setVisivel] = useState<Record<string, boolean>>({})
  const avatar = avatarLocal ?? perfil.data?.avatar ?? ''
  const salvar = useMutation({
    mutationFn: async (valores: Record<string, FormDataEntryValue>) => {
      for (const [nome, valor] of Object.entries(valores)) if (valor && ['senhaNova', 'senhaAtual', 'senhaConfirmacao'].includes(nome)) {
        await mercadoApi.trocarSenha({ atual: valores.senhaAtual, senha: valores.senhaNova, confirmarSenha: valores.senhaConfirmacao })
        break
      }
      return mercadoApi.salvarPerfil({ nome: valores.nomeExibicao, email: valores.email, usuario: valores.usuario,
        nomeEns: valores.nomeEns, apelidoCarteira: valores.apelidoCarteira, avatar, biografia: perfil.data?.biografia ?? '' })
    },
    onSuccess: dados => {
      cache.setQueryData(perfilConsulta(dono).queryKey, dados)
      cache.setQueryData(['sessao'], { ...sessao, perfil: dados })
      avisar('Perfil atualizado.')
    },
  })
  const editar = useMutation({
    mutationFn: ({ tipo, dados }: { tipo: Carteira['tipo']; dados: unknown }) => mercadoApi.salvarCarteira(tipo, dados),
    onSuccess: async nova => {
      await cache.invalidateQueries(carteirasConsulta(dono))
      if (nova.tipo === 'secundaria') setMostrarSecundaria(false)
      avisar('Carteira salva.')
    },
  })
  const erro = salvar.error || editar.error || perfil.error || consulta.error
  const detalhe = erro ? erroDaApi(erro) : undefined
  const visual: Alterar = (node, props, filhos) => {
    const id = node.attribs.id
    const nome = node.attribs.name
    const aba = node.attribs['data-conta-aba']
    if (id === 'conta-formulario-perfil' && perfil.isPending) return <div className="skeleton h-48" />
    if (aba === 'perfil' || aba === 'carteiras') {
      const ativa = carteiras === (aba === 'carteiras')
      return comProps(node, { 'data-ativo': String(ativa), onClick: () => void navigate({ to: aba === 'carteiras' ? '/conta/carteiras' : '/conta/perfil' }) }, filhos())
    }
    if (id === 'conta-painel-perfil' || id === 'conta-painel-carteiras') {
      return comProps(node, ocultar(props, carteiras === id.endsWith('perfil')), filhos())
    }
    if (id === 'conta-formulario-perfil') return comProps(node, { key: perfil.data?.id ?? 'carregando', noValidate: false,
      onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = e.currentTarget
        if (!erroAvatar) salvar.mutate(Object.fromEntries(new FormData(form)), { onSuccess: () => {
          for (const input of form.querySelectorAll<HTMLInputElement>('input[type=password]')) input.value = ''
        } })
      },
    }, filhos())
    if (node.name === 'input' && nome && ['nomeExibicao', 'usuario', 'email', 'nomeEns', 'apelidoCarteira', 'nomePerfil', 'indicacao', 'endereco', 'secundaria', 'apelido'].includes(nome)) {
      const principalDefaults: Record<string, string | undefined> = {
        nomeExibicao: perfil.data?.nome, usuario: perfil.data?.usuario ?? (perfil.data?.email.split('@')[0]),
        email: perfil.data?.email, nomeEns: perfil.data?.nomeEns ?? perfil.data?.email.split('@')[0],
        apelidoCarteira: carteiras ? principal?.nome ?? 'Principal' : perfil.data?.apelidoCarteira ?? principal?.nome ?? 'Principal',
        nomePerfil: perfil.data?.nome, indicacao: 'KURIO', endereco: principal?.endereco, secundaria: secundaria?.endereco, apelido: secundaria?.nome,
      }
      let parent = node.parent
      while (parent && (parent.type !== 'tag' || parent.name !== 'form')) parent = parent.parent
      const segunda = parent?.type === 'tag' && parent.attribs.id === 'conta-formulario-carteira-secundaria'
      return comProps(node, { defaultValue: segunda && nome === 'endereco' ? secundaria?.endereco : principalDefaults[nome],
        'aria-invalid': !!detalhe?.campos?.[nome], 'aria-describedby': detalhe?.campos?.[nome] ? 'conta-aviso' : undefined })
    }
    if (id === 'conta-avatar-arquivo') return comProps(node, { 'aria-label': 'Avatar', onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const arquivo = e.currentTarget.files?.[0]
      if (!arquivo) return
      if (arquivo.size > 290_000 || !/^image\/(png|jpeg|webp)$/.test(arquivo.type)) { setErroAvatar('Use PNG, JPEG ou WebP de até 290 KB.'); return }
      setErroAvatar('')
      const leitor = new FileReader()
      leitor.onload = () => setAvatar(String(leitor.result))
      leitor.readAsDataURL(arquivo)
    } })
    if (id === 'conta-alterar-avatar') return comProps(node, { onClick: () => document.getElementById('conta-avatar-arquivo')?.click() }, filhos())
    if (id === 'conta-remover-avatar') return comProps(node, { onClick: () => { setAvatar(''); setErroAvatar('') } }, filhos())
    if (id === 'conta-avatar-icone' && avatar) return <></>
    if (id === 'conta-avatar-imagem') return comProps(node, { ...ocultar(props, !avatar), src: avatar || undefined })
    if (id?.startsWith('conta-senha-')) return comProps(node, { type: visivel[id] ? 'text' : 'password' })
    if (node.attribs['data-conta-olho']) {
      const campo = node.attribs['data-conta-olho']
      return comProps(node, { 'aria-pressed': !!visivel[campo], onClick: () => setVisivel(v => ({ ...v, [campo]: !v[campo] })) }, filhos())
    }
    if (id === 'conta-formulario-carteira' || id === 'conta-formulario-carteira-secundaria') {
      const segunda = id.endsWith('secundaria')
      return comProps(node, { key: consulta.isPending ? 'carregando' : id, noValidate: false,
        ...(segunda ? { ...ocultar(props, !mostrarSecundaria), className: String(ocultar(props, !mostrarSecundaria).className) + ' grid' } : {}),
        onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
          e.preventDefault()
          const dados = Object.fromEntries(new FormData(e.currentTarget))
          const tipo = segunda ? 'secundaria' : 'principal'
          editar.mutate({ tipo, dados: { nome: segunda ? dados.apelido : dados.apelidoCarteira, endereco: dados.endereco,
            rede: segunda ? (/^0x|\.eth$/i.test(String(dados.endereco)) ? 'Polygon' : 'Solana') : dados.rede, tipo } })
        },
      }, filhos())
    }
    if (node.name === 'select' && nome === 'rede') return comProps(node, { defaultValue: principal?.rede ?? '' }, filhos())
    if (node.name === 'select' && nome === 'tipo') return comProps(node, { defaultValue: 'MetaMask' }, filhos())
    if (id === 'conta-adicionar-carteira-topo') return comProps(node, { onClick: () => document.querySelector<HTMLInputElement>('#conta-formulario-carteira input[name=endereco]')?.focus() }, filhos())
    if (id === 'conta-adicionar-carteira' || id === 'conta-cancelar-secundaria') {
      return comProps(node, { onClick: () => setMostrarSecundaria(id === 'conta-adicionar-carteira') }, id === 'conta-adicionar-carteira' && secundaria ? 'Editar' : filhos())
    }
    if (id === 'conta-copiar-principal') return comProps(node, { disabled: !principal, onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked && principal) editar.mutate({ tipo: 'secundaria', dados: { ...principal, nome: 'Reserva', tipo: 'secundaria' } })
    } })
    if (id === 'conta-sem-carteira-secundaria' && secundaria) return <></>
    if (id === 'conta-carteira-secundaria-resumo') return comProps(node, ocultar(props, !secundaria),
      secundaria ? `${secundaria.nome} · ${secundaria.endereco} · ${secundaria.rede}` : '')
    if (id === 'conta-aviso') return comProps(node, { ...ocultar(props, !detalhe && !erroAvatar), role: 'alert' },
      erroAvatar || Object.values(detalhe?.campos ?? {}).join(' ') || detalhe?.mensagem || '')
    return undefined
  }
  return <Referencia pagina={pagina} alterar={visual} />
}
