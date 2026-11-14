# Registro de bugs e correções · KURIO

## BUG-001 · Rótulos mudavam depois de um erro no formulário

**Estado:** verificado em Chromium desktop e mobile.

- **Reprodução:** tentar cadastrar um e-mail existente e corrigir o campo. O texto de erro entrava no nome acessível, tornando a identificação do campo inconsistente.
- **Correção:** cada campo recebeu ID estável, `label` associado e mensagem referenciada por `aria-describedby`. Arquivo `src/componentes/ui.tsx`.
- **Reteste:** cadastro com conflito, troca de conta e erros de perfil, senha e carteira na suíte Playwright.

## BUG-002 · Mudança de preço não chegava ao checkout por Socket.IO

**Estado:** verificado em Chromium desktop e mobile.

- **Reprodução:** abrir uma revisão e alterar o preço de um NFT pelo cenário. A atualização REST era persistida, mas o WebSocket caía no servidor HTTP e a revisão não recebia o evento.
- **Causa:** a regra inicial incluía o prefixo `/socket.io/`, que o MSW remove ao casar conexões. Outra causa no carregamento inicial era a captura do WebSocket nativo pelo cliente antes da instalação do interceptor.
- **Correção:** vincular a origem normalizada no handler, instalar o mock antes do carregamento do cliente, usar a API `toSocketIo` da versão fixada no lockfile e manter heartbeat. Arquivos `src/mocks/eventos.ts` e `src/integracoes/tempo-real.ts`.
- **Reteste:** o teste de mudança de cotação recebe o evento, bloqueia a confirmação e ignora versões repetidas ou antigas. A suíte também cobre reconexão durante pedido pendente. [Trace da falha original](../reports/traces/BUG-002-socket.zip).

## BUG-003 · A verificação do primeiro Tab começava antes da montagem das rotas

**Estado:** verificado em Chromium desktop e mobile.

- **Reprodução:** disparar o primeiro Tab após a resposta do HTML, antes da montagem da interface e do bootstrap dos mocks.
- **Correção:** iniciar a interação de teclado assim que o título da rota estiver renderizado. A aplicação oferece salto para o conteúdo e Radix restaura foco ao fechar o diálogo.
- **Reteste:** a suíte confirma foco inicial no salto, abertura com Enter, fechamento com Escape, restauração do foco e validação nativa do login.

## BUG-004 · A preparação do Chrome falhava em caminho com espaço

**Estado:** verificado no Windows.

- **Reprodução:** executar Lighthouse a partir de uma pasta em `C:/Users/Jefferson Miranda`. O caminho do perfil era passado com espaço codificado e o Chrome não abria a porta de depuração.
- **Correção:** criar um perfil temporário usando caminho de sistema e iniciar Chrome com argumentos separados. Arquivo `scripts/audit.mjs`.
- **Reteste:** as doze medições foram executadas com relatórios HTML e JSON.

## BUG-005 · Grande deslocamento no catálogo e auditoria de robots inválida

**Estado:** correções verificadas no Lighthouse.

- **Reprodução:** abrir a raiz da aplicação em uma visita limpa. O preenchimento do banner e da grade alterava o layout. A requisição de `robots.txt` recebia o HTML da SPA.
- **Correção:** reservar a geometria da imagem, dos indicadores e dos cards. Incluir `robots.txt`, favicon, WebPs responsivos e dicas de preload para a arte principal. Dividir rotas secundárias para reduzir o código inicial.
- **Reteste:** comparar CLS, LCP, pontuações SEO e boas práticas. O relatório final traz as medianas e os pontos de desempenho que ainda afetam o mobile.

## BUG-006 · Layout recriado divergia do protótipo em `Desafio`

- **Reprodução:** comparar o primeiro build com a página HTML de referência no desktop e com os prints no mobile. O catálogo, o cabeçalho e as telas de compra estavam reorganizados.
- **Causa:** a implementação inicial recriou a marcação das telas em vez de transportar o HTML e o CSS fornecidos.
- **Correção:** copiar as referências sem alteração para `src/referencias` e ligar os componentes React à marcação original. Usar as composições dos prints nas regras mobile, incluindo checkout de carteiras e autenticação.
- **Reteste:** verificação dos hashes, capturas de revisão e cenários Playwright com a marcação de referência. Identificar diferenças de conteúdo dinâmico, acessibilidade e estados de simulação nas comparações.

## BUG-007 · A navegação mobile encobria o botão de cenários

- **Reprodução:** em 390 px, rolar até o fim do início e abrir Cenários. Em algumas posições o botão ficava atrás da navegação fixa.
- **Correção:** reservar espaço depois do painel de demonstração somente na tela mobile com navegação inferior.
- **Reteste:** teste de carregamento lento, recuperação de erro e mudança de cenário em Chromium mobile. [Trace da falha](../reports/traces/BUG-007-cenarios-mobile.zip).

## BUG-008 · Paginação de NFTs relacionados não respondia

- **Reprodução:** abrir o detalhe em desktop e acionar um dos três indicadores da seção Mais desta coleção.
- **Correção:** usar a ordem, os deslocamentos e os cinco cartões do protótipo em `Desafio/mercado/interacoes.js`. A lista usa dados da API e carrega ao se aproximar da área visível.
- **Reteste:** o teste de detalhe abre a seção, confere os cinco links e valida a mudança do cartão inicial e do estado do indicador.

## BUG-009 · Espaçamentos e controles divergiam dos prints mobile

- **Reprodução:** comparar as seis telas mobile com a área interna dos prints. A ficha do NFT tinha margens e corte diferentes, o carrinho tinha linhas mais baixas e o cadastro não exibia o controle de visibilidade da confirmação da senha.
- **Correção:** aproximar as proporções a partir das áreas internas dos prints, ajustar botões, espaçamentos e ordem das edições e ligar o controle de senha ao campo correspondente. As fontes, imagens e HTMLs de referência seguem no projeto.
- **Reteste:** snapshots Playwright e comparação lado a lado com os seis prints. As capturas também registram os valores e os estados dos dados da demonstração.

## BUG-010 · A inicialização repetia trabalho antes da primeira pintura

- **Reprodução:** abrir o catálogo ou detalhe com armazenamento limpo e inspecionar as consultas e o bundle.
- **Correção:** usar Zod Mini, limitar o processamento ao HTML da página, carregar o estado de demonstração ao abrir o painel e fazer a reconciliação REST nos eventos de reconexão. Os mocks usam um verificador pré-calculado para as contas públicas de demonstração.
- **Reteste:** suíte de fluxos incluindo login, cenários, dados persistidos, eventos e retomada de pedidos. As auditorias documentam o custo restante da inicialização.

## Como registrar o próximo bug

Crie uma ficha com data, estado, requisito, ambiente, viewport, cenário, passos, resultado esperado, resultado observado, causa, arquivos da correção, teste e evidência do reteste. Use `Aberto`, `Corrigido` ou `Verificado`. As regras do desafio estão em [Regras de negócio](REGRAS-DE-NEGOCIO.md).
