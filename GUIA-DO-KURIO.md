# Guia do KURIO

Este guia acompanha o KURIO desde o clique na tela até a resposta da API. Você pode usá-lo para revisar o código, publicar a versão e repetir os testes que a Jungle Gaming pediu.

- [Mapa da estrutura](#1-mapa-da-estrutura)
- [O que acontece em cada fluxo](#2-o-que-acontece-em-cada-fluxo)
- [Publicar no GitHub e no Netlify](#3-publicar-no-github-e-no-netlify)
- [Testar no endereço publicado](#4-testar-no-endereço-publicado)
- [Executar testes e gerar relatórios](#5-executar-testes-e-gerar-relatórios)
- [Registrar um bug e fechar a entrega](#6-registrar-um-bug-e-fechar-a-entrega)

## 1. Mapa da estrutura

O Netlify entrega ao navegador os arquivos do site. O navegador abre a tela React e faz pedidos para endereços como `/api/nfts`. O MSW intercepta esses pedidos e entrega respostas simuladas. Para guardar alterações entre recargas, a simulação usa IndexedDB, um banco embutido no navegador. No KURIO, a criação da estrutura do banco está no `upgrade` de `banco.ts`, que cria o armazenamento na versão 1. Em sistemas com banco no servidor, *migrations* são alterações versionadas da estrutura ou dos dados. Aqui, a configuração do banco e os dados iniciais ficam em dois arquivos locais. [Banco da simulação](src/mocks/banco.ts) · [Dados iniciais](src/mocks/fixtures.ts)

O caminho de um clique e o caminho de um aviso em tempo real podem ser lidos da esquerda para a direita.

```text
Clique → Tela React → TanStack Query → Axios → MSW → Regra de negócio → IndexedDB
                                               ↑                            │
Interface atualizada ← Cache atualizado ← Resposta da API ←─────────────────┘

Mudança simulada → Socket.IO → Consultas marcadas para atualizar → Nova leitura REST
```

| Parte | Responsabilidade em linguagem simples | Onde abrir |
| --- | --- | --- |
| Entrada do site | O HTML abre o aplicativo. O React liga a simulação, recupera a sessão e monta a página. | [index.html](index.html), [main.tsx](src/main.tsx) |
| Rotas | Liga cada endereço à tela certa. Em páginas privadas, verifica a sessão, encaminha ao login e guarda o endereço para retomar depois. | [router.tsx](src/app/router.tsx) |
| Sessão e cache | O contexto informa quem está logado. O cache é a cópia temporária das respostas que a interface pode reutilizar. Ao trocar de conta, as consultas privadas e do carrinho são descartadas. | [contexto.ts](src/app/contexto.ts), [consultas.ts](src/app/consultas.ts) |
| Módulos de tela | Organizam o trabalho por recurso. Leem formulários e cliques, chamam a API e exibem carregamento, retorno, erro ou sucesso. | [Catálogo](src/modulos/catalogo/CatalogoVisual.tsx), [Detalhe](src/modulos/nft/DetalheVisual.tsx), [Carrinho](src/modulos/carrinho/CarrinhoVisual.tsx), [Conta](src/modulos/conta/ContaVisual.tsx), [Pagamento](src/modulos/pedidos/PagamentoVisual.tsx) |
| Componentes e visual | Reaproveitam botões, diálogos, navegação e marcação. `Referencia.tsx` liga o HTML copiado de `Desafio` a links, dados e botões funcionais. O CSS responsivo adapta o HTML aos prints mobile. | [ui.tsx](src/componentes/ui.tsx), [Referencia.tsx](src/componentes/Referencia.tsx), [Navegação mobile](src/componentes/NavegacaoMobile.tsx), [referências](src/referencias/), [estilos](src/estilos/) |
| Contratos | Definem os campos aceitos e o formato das respostas. Por exemplo, quantidade inteira e preço em ETH representado como texto decimal. | [mercado.ts](src/contratos/mercado.ts) |
| Integrações | Axios envia os pedidos REST. Socket.IO mantém a conexão para receber avisos de mudança. | [api.ts](src/integracoes/api.ts), [tempo-real.ts](src/integracoes/tempo-real.ts) |
| API simulada | Cada *handler* atende um endereço e encaminha a operação. As regras calculam valores, verificam estoque, contas e permissões e gravam o resultado. | [browser.ts](src/mocks/browser.ts), [handlers.ts](src/mocks/handlers.ts), [http.ts](src/mocks/http.ts), [conta.ts](src/mocks/conta.ts), [compras.ts](src/mocks/compras.ts) |
| Dados e cenários | `fixtures.ts` descreve os registros iniciais. `banco.ts` mantém o estado. O painel Cenários configura falhas e pode gerar eventos pela simulação. | [fixtures.ts](src/mocks/fixtures.ts), [banco.ts](src/mocks/banco.ts), [Demonstracao.tsx](src/app/Demonstracao.tsx), [eventos.ts](src/mocks/eventos.ts) |
| Build e hospedagem | Vite prepara React, CSS e imagens em `dist/`. O arquivo `_redirects` permite abrir uma rota diretamente ou apertar F5. O Service Worker do MSW precisa estar acessível na mesma origem. | [package.json](package.json), [vite.config.ts](vite.config.ts), [netlify.toml](netlify.toml), [_redirects](public/_redirects), [mockServiceWorker.js](public/mockServiceWorker.js) |
| Testes e documentação | Playwright repete interações de usuário. Lighthouse mede qualidade e performance. As regras e os bugs registram o que foi exigido, observado e corrigido. | [Playwright](playwright.config.ts), [testes](tests/), [Lighthouse](scripts/audit.mjs), [regras](docs/REGRAS-DE-NEGOCIO.md), [bugs](docs/BUGS-E-CORRECOES.md) |

O **IndexedDB** guarda catálogo, contas, carrinhos, pedidos e o cenário selecionado no perfil do navegador e no endereço de origem. O **localStorage** guarda o identificador do visitante, usado para recuperar seu carrinho. O **sessionStorage** guarda o token de login e a tentativa de compra na aba, inclusive após F5. Abrir o localhost e abrir o Netlify cria dois ambientes de dados. Para testar duas abas compartilhando eventos, abra a mesma URL base no mesmo perfil do navegador. O token fica por aba, por isso a segunda aba pode abrir o painel sem precisar entrar novamente. [Arquitetura](ARCHITECTURE.md#sessão-cache-e-compra)

## 2. O que acontece em cada fluxo

### Catálogo e detalhe

1. Ao escolher filtros ou mudar a ordenação, a tela atualiza a URL. O roteador valida esses parâmetros. Cada combinação tem sua própria consulta no cache.
2. O módulo pede a lista por `GET /api/nfts`. A API simulada filtra, ordena e divide os itens em páginas. A pesquisa obsoleta pode ser cancelada quando o texto muda.
3. Ao clicar em um cartão, `/nfts/$nftId` consulta um NFT pelo identificador. A ficha mostra imagens, edições e estoque. Se o endereço for inválido ou faltar conexão, a tela mostra a mensagem correspondente. [Catálogo](src/modulos/catalogo/CatalogoVisual.tsx) · [Consulta de detalhe](src/modulos/nft/Detalhe.tsx) · [Ficha](src/modulos/nft/DetalheVisual.tsx) · [Handlers REST](src/mocks/handlers.ts)

### Cadastro, login, perfil, carteiras e favoritos

1. O formulário reúne os dados e chama a API. A simulação valida os campos, verifica duplicidade de e-mail e devolve um token de sessão. Para as senhas, o banco armazena um verificador calculado com PBKDF2 e um salt.
2. Se já houver itens no carrinho de visitante, a API os combina com os da conta. O token identifica a pessoa nos pedidos seguintes. Quando a sessão expira, o roteador encaminha ao login e pode retomar o endereço de origem.
3. Perfil, senha, avatar e carteiras principal e secundária são editados na área Minha conta. As alterações passam pelos handlers e são gravadas por conta.
4. O favorito muda na tela ao clicar para dar retorno imediato. Se o mock recusa a gravação, a tela desfaz a mudança e informa o erro. [Autenticação](src/modulos/conta/AutenticacaoVisual.tsx) · [Conta](src/modulos/conta/ContaVisual.tsx) · [Favoritar](src/modulos/nft/Favoritar.tsx) · [API de conta](src/mocks/conta.ts)

### Carrinho e cotação

1. **Adicionar ao carrinho** envia o NFT, a edição e a quantidade. A edição identifica a linha junto com o NFT. A simulação verifica estoque e reservas.
2. A tela mostra o resumo que a API devolve. O cupom `KURIO10` dá 10% de desconto sobre os itens. O cálculo usa wei, a unidade inteira do ETH, para evitar arredondamento de ponto flutuante.
3. Alterar quantidade, aplicar cupom ou remover uma linha passa pela mesma camada da API. A resposta atualiza o carrinho no cache e sinaliza ao checkout para consultar a cotação novamente. [Tela](src/modulos/carrinho/CarrinhoVisual.tsx) · [Ações do carrinho](src/modulos/carrinho/estado.ts) · [Cálculo, cupom e estoque](src/mocks/compras.ts)

### Checkout, pedido e recibo

1. Ao entrar em `/pagamento`, a tela consulta carteiras e a cotação da rede escolhida. O primeiro **Confirmar compra** valida os dados, conecta a carteira simulada e abre **Revisar compra**.
2. Ao confirmar no diálogo, a tela grava um identificador da tentativa e envia o pedido. A API confere carteira, rede, estoque, cupom, taxas e preço. Se a cotação mudou, a pessoa precisa revisá-la novamente.
3. A API registra o pedido como **pendente** e reserva as unidades. Se houver timeout, **Consultar ou reenviar tentativa** usa a mesma chave e recupera o mesmo pedido. No código, essa proteção é a **idempotência**.
4. No estado **confirmado**, a API retira só as unidades compradas e preserva uma cópia dos valores e dos itens do pedido. O recibo exibe essa cópia, mesmo após uma mudança de preço. No estado **recusado**, a reserva é liberada e os itens continuam no carrinho. [Checkout](src/modulos/pedidos/PagamentoVisual.tsx) · [Tentativa na aba](src/modulos/pedidos/tentativa.ts) · [Regras de compra](src/mocks/compras.ts) · [Pedido e recibo](src/modulos/pedidos/PedidoVisual.tsx)

### Tempo real e recuperação

1. Uma alteração de NFT grava o novo preço ou estoque e emite `nft.updated`. A resolução de um pedido emite `order.updated` para a conta responsável.
2. O cliente compara a versão do evento com a última que recebeu. Se o evento for novo, o cache pede dados atualizados à API e a interface mostra o resultado. O REST continua sendo a referência para preço e estado.
3. Ao reconectar, o cliente consulta novamente os recursos ativos. Uma recarga também permite recuperar o pedido por REST. Na tela de pedido pendente, **Consultar status** faz essa consulta sob demanda. [Cliente Socket.IO](src/integracoes/tempo-real.ts) · [Eventos simulados](src/mocks/eventos.ts)

### Funções que você pode procurar no editor

| Se quiser entender | Procure por |
| --- | --- |
| O que o aplicativo liga ao abrir | `iniciar` em [main.tsx](src/main.tsx) e `Aplicacao` em [router.tsx](src/app/router.tsx). |
| Onde a rota privada exige login e onde os dados da conta anterior saem da memória | `exigirSessao` em [router.tsx](src/app/router.tsx) e `trocarSessao` em [consultas.ts](src/app/consultas.ts). |
| Como cria, lê, altera ou restaura os dados de teste | `bancoInicial`, `lerBanco`, `editarBanco` e `resetBanco` em [banco.ts](src/mocks/banco.ts). |
| Onde começa cada pedido da interface para a API | `mercadoApi` em [api.ts](src/integracoes/api.ts). A lista de endereços e operações está na [tabela de contratos REST](ARCHITECTURE.md#contratos-rest). |
| Quem confirma preço, estoque e pedido | `alterarItem`, `calcularCotacao`, `criarPedido` e `resolverPedidos` em [compras.ts](src/mocks/compras.ts). |
| Quem guarda e reaproveita a tentativa de compra | `guardarTentativa` e `lerTentativa` em [tentativa.ts](src/modulos/pedidos/tentativa.ts). |
| Quem manda o aviso de mudança e quem pede dados atualizados | `emitirNft` e `atualizarPedidos` em [eventos.ts](src/mocks/eventos.ts). `useTempoReal` em [tempo-real.ts](src/integracoes/tempo-real.ts). |

### Onde começar se algo der errado

| Sintoma | Primeiro arquivo para revisar |
| --- | --- |
| Uma URL conhecida abre a página inexistente ou perde o filtro | [router.tsx](src/app/router.tsx). Se acontecer apenas no deploy após F5, confira [_redirects](public/_redirects). |
| Um botão, card ou formulário tem comportamento errado | Abra o módulo da tela e procure pelo texto ou pelo identificador do elemento. Para botões e navegação repetidos, abra [Referencia.tsx](src/componentes/Referencia.tsx). |
| A tela está certa, mas o cálculo ou o acesso está errado | [compras.ts](src/mocks/compras.ts) para preço, cupom, estoque e pedido. [conta.ts](src/mocks/conta.ts) e [banco.ts](src/mocks/banco.ts) para sessão e permissão. |
| O mock bloqueou o catálogo após um teste | Abra **Cenários → Voltar ao normal**. Se o painel também falhar, confira se a página é HTTPS ou localhost e se `/mockServiceWorker.js` retorna JavaScript. |
| A alteração só aparece depois do F5 | Verifique se o evento sai de [eventos.ts](src/mocks/eventos.ts) e se [tempo-real.ts](src/integracoes/tempo-real.ts) atualiza a consulta correta. |
| O problema é só de espaçamento, cor ou tamanho | Compare com o HTML e os prints de `Desafio`. Confira primeiro [referencia.css](src/estilos/referencia.css) para mobile e [global.css](src/estilos/global.css) para o estilo comum. |

## 3. Publicar no GitHub e no Netlify

### GitHub para o código e as evidências

1. Crie seu próprio repositório vazio no GitHub e escolha uma visibilidade que permita à equipe avaliadora abrir o link. Se usar um repositório privado, conceda o acesso antes de enviar.
2. Abra o PowerShell na pasta do KURIO. Confira o estado e o endereço do repositório. Se ainda não existir `origin`, substitua o endereço de exemplo pelo seu na linha `git remote add origin`. Se já existir, confira se aponta para o projeto certo antes do push.

```powershell
Set-Location -LiteralPath 'C:\Users\Jefferson Miranda\Desktop\KURIO'
git status --short
git remote -v
```

Se a lista de remotos estiver vazia, configure `origin` com o endereço do seu repositório. Confira a saída antes de enviar.

```powershell
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git remote -v
```

Com o endereço correto, publique a branch `main` e anote o identificador curto da versão.

```powershell
git push -u origin main
git rev-parse --short HEAD
```

3. Abra o GitHub e confirme que estão lá o README, este guia, o [checklist](docs/CHECKLIST-DO-DESAFIO.md), o [registro de bugs](docs/BUGS-E-CORRECOES.md), os arquivos em `tests/` e os traces em `reports/traces/`.
4. Após conferir o site conforme a seção 4 deste guia, abra **Releases → Draft a new release** no seu repositório. Escolha ou crie uma tag para o commit publicado. No título use, por exemplo, **KURIO — Entrega do desafio**. Na descrição, informe a URL do site, o resultado dos testes e de onde vieram as medições. Anexe `KURIO-Relatorios.zip`. O resumo também fica em [RESULTADOS-DA-VALIDACAO.md](docs/RESULTADOS-DA-VALIDACAO.md). Se usar as capturas na entrega, anexe `KURIO-Capturas.zip` à mesma versão. Confira os anexos antes de publicar a release. Se mediu novamente na URL pública, identifique esse relatório separadamente do relatório local. [Como criar uma release no GitHub](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)

### Netlify para o site que abre no navegador

1. Extraia `KURIO-Netlify.zip` em uma pasta vazia. A pasta extraída deve ter `index.html`, `_redirects`, `mockServiceWorker.js`, `assets/` e `images/` na raiz. Se fizer uma nova versão, rode `npm ci` e `npm run build` no projeto e use a pasta `dist/` gerada.
2. Entre na sua conta no Netlify e arraste essa pasta para o [Netlify Drop](https://app.netlify.com/drop). Para atualizar um site criado por upload manual, use a área de upload da página de deploys do mesmo site. Se você preferir importar o GitHub, o `netlify.toml` do projeto configura Node 22, `npm run build`, pasta `dist` e mocks ligados.
3. Abra a URL HTTPS pública em um perfil limpo e faça o roteiro abaixo. Confirme também que a URL abre para alguém sem login no Netlify. [Upload manual no Netlify](https://docs.netlify.com/deploy/create-deploys/#drag-and-drop) · [Vite no Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/)

| Arquivo | Uso |
| --- | --- |
| `KURIO-Codigo.zip` | Cópia do código e da documentação para revisar ou reconstruir o projeto. |
| `KURIO-Netlify.zip` | Build para extrair e subir no Netlify. |
| `KURIO-Relatorios.zip` | Evidências da última validação local. Inclui testes, Lighthouse, registro de bugs e checklist. Anexe à release do código correspondente. |
| `KURIO-Capturas.zip` | Capturas do projeto e comparação mobile lado a lado com os prints. |

## 4. Testar no endereço publicado

Faça a primeira rodada em Chromium ou Chrome. Para cada linha do roteiro, marque **Passou**, **Falhou** ou **Pendente**. Use as contas fictícias `ana@kurio.test` e `leo@kurio.test`, ambas com senha `Kurio123!` em uma instalação limpa. Para começar um teste do zero, use um perfil limpo ou **Cenários → Resetar demonstração → Confirmar reset**. O reset apaga contas criadas e alterações feitas naquele navegador para aquele site. Durante a navegação normal, o painel fica em **Normal**. Entre testes de falha use **Voltar ao normal** e feche o painel. Essa opção preserva seus dados. Um preço ou estoque mudado pelo painel continua alterado até você restaurá-lo ou resetar.

### Rodada de funcionamento

| Teste | Como fazer | Resultado esperado |
| --- | --- | --- |
| Acesso público e F5 | Abra `/`, `/index.html#inicio` e `/nfts/nft-01` diretamente. Aperte F5 no detalhe e no carrinho. Teste também `/nfts/inexistente`. | A URL antiga abre o início, o detalhe real abre após recarga e o NFT inexistente recebe uma mensagem específica. |
| Busca, filtros e histórico | Sem filtros, pesquise `Emerald`. Limpe a busca, combine categoria e rede, mude a ordenação, limpe filtros e vá à página 2. Use Voltar, Avançar e F5. | O resultado acompanha o endereço. Mudar filtro volta à página 1. No desktop, abra a lista Ordenação e confira se as opções são legíveis. |
| Galeria e estoque | Em `/nfts/nft-01`, amplie a imagem, troque de imagem e selecione a edição `1/10`. Escolha outra edição e aperte o botão de aumentar até o limite. | A galeria abre. A edição esgotada bloqueia a compra. A quantidade respeita o estoque da edição disponível. |
| Carrinho e login | Como visitante, adicione uma unidade de Emerald na edição `1/50`. Abra o carrinho e aumente para duas. Aplique `EXPIRADO`, um código inválido e depois `KURIO10`. Atualize, entre pela etapa de finalizar e, após conferir, remova o cupom ou o item. | Mensagens distinguem os cupons recusados. Com os dados iniciais, o subtotal para duas unidades é `2.38 ETH` e o total com cupom na Ethereum é `2.158 ETH`. Login e refresh preservam o carrinho. |
| Compra e recibo | Em um carrinho limpo, adicione uma unidade de Emerald `1/50`, mantenha a carteira principal Ethereum e envie após revisar. Guarde a URL do pedido, volte ao carrinho e reabra o recibo. | A compra passa por pendente e chega à confirmação. Com os dados iniciais, na Ethereum e sem cupom, o recibo exibe `1.206 ETH` e a transação fictícia. O carrinho perde a unidade comprada. O mesmo recibo continua acessível após F5. |
| Conta e permissões | Tente cadastrar `ana@kurio.test`, depois crie um e-mail fictício diferente. Revise o perfil e a troca de senha. Entre com Ana para testar avatar e carteiras principal e secundária. Favorite um NFT, recarregue e entre com Leo. Abra a URL de um pedido da Ana com Leo. | Cadastro repetido é recusado. Alterações válidas persistem e erros aparecem. Favoritos e pedidos são isolados por conta. A rota privada pede login quando necessário. |

### Rodada de falhas e tempo real

| Teste | Como fazer | Resultado esperado |
| --- | --- | --- |
| Vazio, lentidão e falha de API | Em Cenários, use **Catálogo vazio**, **Carregamento lento**, **Falha de conexão com a API** e **Serviço indisponível (503)**, um por vez. Feche o painel e recarregue. Depois volte ao normal. | A tela mostra vazio, cartões de carregamento ou a mensagem de erro correspondente. A lista volta a funcionar com os itens existentes preservados. |
| Respostas fora de ordem | Com **Respostas fora de ordem**, pesquise `Sa` e logo em seguida `Emerald`. No desktop o campo fica no botão de busca. No mobile pode digitar diretamente no catálogo. | O resultado de Emerald permanece mesmo se a consulta curta demorar mais. |
| Falha de favorito e sessão | Logado, selecione **Falha ao salvar favorito** e clique no coração de um NFT ainda sem favorito. Depois volte ao normal e, no checkout, use **Expirar sessão**. Entre novamente. | O coração volta ao estado anterior e o erro aparece. O login permite retomar a compra com o carrinho. |
| Carteira recusada e pagamento recusado | Antes de revisar uma compra, selecione **Conexão de carteira recusada**. Depois volte ao normal e tente novamente. Feche qualquer revisão aberta antes do próximo teste. Selecione **Pagamento recusado**, revise e envie. | A primeira falha aparece ao conectar a carteira. No segundo teste o pedido termina recusado e os itens permanecem no carrinho. |
| Cotação em tempo real | Deixe o Emerald `nft-01` no carrinho e abra **Revisar compra**. Em outra aba do mesmo site, abra Cenários e dispare o novo preço `1,49` para `nft-01`. Repita com a opção de reenviar versão anterior marcada. Para testar esgotamento separadamente, dispare estoque `0`. | A primeira aba avisa sobre a cotação alterada e bloqueia o envio até nova revisão. Eventos repetidos ou antigos não revertem o valor. Estoque zero impede a compra da edição. |
| Timeout e envio repetido | Com **Tempo limite após criar pedido**, abra a revisão e tente confirmar duas vezes rapidamente. Após o aviso de demora, recarregue na mesma aba e use **Consultar ou reenviar tentativa**. | A mesma tentativa é recuperada. Ao terminar, há um recibo e uma baixa das unidades compradas. |
| Desconexão e pedido pendente | Com **Pedido demora a confirmar**, envie. Enquanto estiver pendente, abra Cenários, clique **Interromper conexão** e recarregue a URL do pedido. Se ainda estiver na tela pendente após alguns segundos, clique em **Consultar status**. | O mesmo endereço recupera o pedido e chega ao estado terminal sem reenviar a compra. |

### Rodada visual e acessibilidade

- [ ] Em `1440 px`, `768 px` e `390 px`, revise início, detalhe, carrinho, checkout, login, cadastro, perfil, carteiras e recibo. Abra filtros, menus e formulários. Observe se texto ou botões saem da tela. Compare as seis telas mobile com os prints em `Desafio`.
- [ ] Em um desktop, use **Tab**, **Shift+Tab**, **Enter** e **Escape**. Confira foco visível, caminho até os botões, foco preso no diálogo aberto e retorno ao disparador ao fechar. Ative movimento reduzido no navegador ou no sistema e confira os skeletons.
- [ ] Use zoom de **200%** e passe pelos controles principais, especialmente em filtros, carrinho e pagamento. Registre qualquer conteúdo cortado ou ação que fique inacessível.

## 5. Executar testes e gerar relatórios

Abra o PowerShell na raiz do projeto. Os testes de ponta a ponta, chamados de **E2E**, percorrem a interface como uma pessoa faria. A **regressão visual** compara capturas do build com baselines versionadas. Para avaliar a fidelidade ao design, compare também com o print original. O **Lighthouse** mede a qualidade da página que o navegador carrega. [Testes definidos](tests/) · [Resultados da validação](docs/RESULTADOS-DA-VALIDACAO.md)

### Na sua máquina

```powershell
node --version
npm ci
npx playwright install chromium
npm run build
npm run lint
npm run test:e2e
npx playwright show-report
npm run audit
```

O comando `npm run test:e2e` abre o build em localhost quando você usa a configuração padrão. Para separar os testes, use `npm run test:e2e -- tests/fluxos.spec.ts` para os fluxos, `npm run test:e2e -- tests/visual.spec.ts` para as capturas e `npm run test:e2e -- tests/responsividade.spec.ts` para tablet. Feche o servidor de visualização do relatório com **Ctrl+C** para seguir no mesmo terminal. Em caso de falha, abra o trace pelo relatório ou use `npx playwright show-trace CAMINHO-DO-TRACE.zip`.

### Na URL publicada

Troque `seu-site.netlify.app` pela URL que o Netlify mostrar. Use a raiz do site, sem acrescentar um caminho de tela.

```powershell
$env:KURIO_TEST_URL = 'https://seu-site.netlify.app'
npm run test:e2e
Remove-Item Env:KURIO_TEST_URL

$env:KURIO_AUDIT_URL = 'https://seu-site.netlify.app'
npm run audit
Remove-Item Env:KURIO_AUDIT_URL
```

Antes de rodar os comandos com a URL pública, preserve os relatórios locais em outra pasta. A suíte e a auditoria escrevem nos mesmos caminhos a cada execução. A auditoria usa um perfil limpo e mede início e detalhe três vezes em desktop e mobile. Abra `reports/lighthouse/medianas.json` para ver os resultados centrais. As metas são **90 em performance e SEO**, **95 em acessibilidade e boas práticas**. Guarde os relatórios HTML e JSON com o ambiente e os valores de LCP, CLS e TBT. [Requisitos de auditoria](https://github.com/junglegaming/frontend-challenge#10-performance-e-lighthouse)

| Resultado | Onde encontrar |
| --- | --- |
| Relatório HTML do Playwright | `playwright-report/index.html` |
| Trace e captura de uma falha nova | `test-results/` |
| Traces preservados de falhas de desenvolvimento | [reports/traces/](reports/traces/) |
| Auditorias e medianas | `reports/lighthouse/` |
| Registro legível das medições e das limitações atuais | [RESULTADOS-DA-VALIDACAO.md](docs/RESULTADOS-DA-VALIDACAO.md) |

## 6. Registrar um bug e fechar a entrega

Para cada problema, anote o cenário, endereço, viewport, versão ou commit, passos para repetir, resultado esperado e resultado visto. Quando corrigir, acrescente o arquivo alterado e como conferiu a correção. Se houver falha automatizada, preserve o trace. [Registro de bugs](docs/BUGS-E-CORRECOES.md)

- [ ] Confirme que o GitHub mostra o código, o guia, os testes e os links das evidências da mesma versão.
- [ ] Confirme que o Netlify está servindo o build correspondente e que o endereço abre sem autenticação da plataforma.
- [ ] Faça a rodada de funcionamento, falhas, tempo real e visual na URL pública. Salve os novos relatórios com identificação da versão e do ambiente.
- [ ] Confira as pendências do checklist. Na última rodada local, passaram 41 testes. O Lighthouse registrou performance mobile 68 no início e 71 no detalhe, com meta 90. A comparação também registra diferenças visuais. [Checklist do desafio](docs/CHECKLIST-DO-DESAFIO.md)
- [ ] Envie o link do repositório e a URL pública pelo canal da etapa técnica. [Formulário de entrega da Jungle Gaming](https://entrevistas.45-55-130-35.sslip.io/testes/front-remoto)
