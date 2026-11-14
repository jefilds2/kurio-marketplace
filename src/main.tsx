import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import '@fontsource-variable/roboto-mono/wght.css'
import './estilos/global.css'
import './estilos/referencia.css'
import './referencias/minha-conta.css'
import './referencias/pagamentos.css'
import './referencias/confirmacao-pedido.css'
import { cache, sessaoConsulta } from './app/consultas'
import { router } from './app/router'
import { mocksAtivos, tokenAtual } from './integracoes/api'

const root = createRoot(document.getElementById('root')!)
async function iniciar() {
  if (mocksAtivos) {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
  }
  if (tokenAtual()) await cache.fetchQuery(sessaoConsulta).catch(() => null)
  else cache.setQueryData(sessaoConsulta.queryKey, null)
  root.render(<QueryClientProvider client={cache}><RouterProvider router={router} /></QueryClientProvider>)
}
void iniciar().catch(erro => {
  console.error('Falha ao iniciar a API simulada do KURIO', erro)
  root.render(<main className="pagina estado-vazio"><h1>Não foi possível iniciar a demonstração</h1>
    <p>Abra em HTTPS ou localhost e permita o uso de Service Workers e armazenamento do site. No navegador integrado, tente abrir o mesmo endereço em uma aba comum.</p>
    <button className="botao botao-principal" onClick={() => location.reload()}>Tentar novamente</button></main>)
})
