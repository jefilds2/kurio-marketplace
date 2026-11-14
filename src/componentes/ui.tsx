import { Slot, Dialog } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { twMerge } from 'tailwind-merge'
import { clsx, type ClassValue } from 'clsx'
import { Minus, Plus, X } from 'lucide-react'
import { useId, type ComponentProps, type ReactNode } from 'react'
import type { Cotacao } from '../contratos/mercado'
import { exibirEth } from '../contratos/mercado'
import { erroDaApi } from '../integracoes/api'

export const cn = (...classes: ClassValue[]) => twMerge(clsx(classes))
const variacoes = cva('botao', {
  variants: { variant: { default: 'botao-principal', outline: 'botao-contorno', ghost: 'botao-discreto' } },
  defaultVariants: { variant: 'default' },
})
export function Button({ asChild, variant, className, ...props }: ComponentProps<'button'> & VariantProps<typeof variacoes> & { asChild?: boolean }) {
  const Elemento = asChild ? Slot.Root : 'button'
  return <Elemento data-slot="button" className={cn(variacoes({ variant }), className)} {...props} />
}
export function Janela({ titulo, descricao, gatilho, children, lateral, aberta, aoMudar }: {
  titulo: string; descricao: string; gatilho?: ReactNode; children: ReactNode; lateral?: boolean
  aberta?: boolean; aoMudar?: (aberta: boolean) => void
}) {
  return <Dialog.Root open={aberta} onOpenChange={aoMudar}>
    {gatilho && <Dialog.Trigger asChild>{gatilho}</Dialog.Trigger>}
    <Dialog.Portal>
      <Dialog.Overlay className="janela-fundo" />
      <Dialog.Content className={cn('janela-conteudo', lateral && 'janela-lateral')}>
        <div className="flex items-start justify-between gap-4">
          <Dialog.Title className="text-lg font-bold">{titulo}</Dialog.Title>
          <Dialog.Close asChild><Button variant="ghost" aria-label="Fechar"><X size={18} /></Button></Dialog.Close>
        </div>
        <Dialog.Description className="mt-2 mb-5 text-sm text-kurio-secundaria">{descricao}</Dialog.Description>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
export function Campo({ rotulo, erro, ...props }: ComponentProps<'input'> & { rotulo: string; erro?: string }) {
  const id = useId()
  const campoId = props.id ?? id
  const erroId = campoId + '-erro'
  return <div className="campo">
    <label htmlFor={campoId}>{rotulo}</label>
    <input {...props} id={campoId} className={cn('entrada', props.className)}
      aria-invalid={!!erro} aria-describedby={erro ? erroId : undefined} />
    {erro && <small id={erroId} className="erro-campo">{erro}</small>}
  </div>
}
export function Erro({ erro, tentar }: { erro: unknown; tentar?: () => void }) {
  if (!erro) return null
  return <div className="aviso-erro" role="alert">
    <p>{erroDaApi(erro).mensagem}</p>{tentar && <Button variant="outline" onClick={tentar}>Tentar novamente</Button>}
  </div>
}
export const Skeleton = ({ className }: { className?: string }) => <div className={cn('skeleton', className)} aria-hidden="true" />
export function Quantidade({ valor, maximo, aoMudar, desabilitado }: {
  valor: number; maximo: number; aoMudar: (n: number) => void; desabilitado?: boolean
}) {
  return <div className="quantidade" aria-label="Quantidade">
    <Button variant="ghost" aria-label="Diminuir quantidade" disabled={desabilitado || valor <= 1} onClick={() => aoMudar(valor - 1)}><Minus size={14} /></Button>
    <output aria-live="polite">{valor}</output>
    <Button variant="ghost" aria-label="Aumentar quantidade" disabled={desabilitado || valor >= maximo} onClick={() => aoMudar(valor + 1)}><Plus size={14} /></Button>
  </div>
}
export function Resumo({ cotacao }: { cotacao: Cotacao }) {
  return <dl className="resumo-valores">
    <div><dt>Subtotal</dt><dd>{exibirEth(cotacao.subtotal)}</dd></div>
    <div><dt>Desconto{cotacao.cupom ? ' (' + cotacao.cupom + ')' : ''}</dt><dd>− {exibirEth(cotacao.desconto)}</dd></div>
    <div><dt>Taxa de rede</dt><dd>{exibirEth(cotacao.taxa)}</dd></div>
    <div className="resumo-total"><dt>Total</dt><dd>{exibirEth(cotacao.total)}</dd></div>
  </dl>
}
