# Regras de negócio · KURIO

Referência normativa em [README oficial da Jungle Gaming](README-OFICIAL.md). Os códigos abaixo servem para associar requisitos, testes e bugs.

| Código | Área | Critério verificável |
| --- | --- | --- |
| CAT-01 | Catálogo | A página inicial exibe destaques e catálogo. Busca, filtros combináveis, ordenação e página fazem parte da URL. Mudar filtro volta à primeira página. Atualizar a página e usar Voltar/Avançar restaura o estado. |
| CAT-02 | Consulta | A API recebe e aplica os parâmetros. Resultado vazio, falha, carregamento e atualização em segundo plano têm estados próprios. Uma resposta atrasada da busca anterior não substitui os resultados atuais. |
| NFT-01 | Detalhe | Cada NFT abre por URL direta. O detalhe mostra galeria, informações, edições, quantidade e compra. NFT inexistente, edição esgotada e quantidade acima do estoque têm tratamento próprio. |
| NFT-02 | Favoritos | Apenas colecionadores autenticados podem consultar, incluir e remover favoritos. Os dados persistem por conta. A alteração otimista reverte com feedback se a mutation falhar. |
| CAR-01 | Itens | Carrinho suporta adicionar, alterar quantidade inteira e remover itens. A identidade da linha combina NFT e edição. A API verifica disponibilidade por edição. O carrinho do visitante sobrevive ao refresh e os itens são preservados na autenticação, com feedback para conflitos de limite. |
| CAR-02 | Cotação | O cupom pode ser aplicado e removido. Código inválido ou expirado recebe resposta explícita. Subtotal, desconto, taxa de rede e total vêm da API simulada. Preços e totais em ETH circulam como strings decimais e mantêm precisão nos cálculos e na exibição. |
| CAR-03 | Atualização | Mudança de preço ou estoque de um NFT do carrinho atualiza o resumo e é anunciada. A interface comunica indisponibilidade e mantém acesso às ações aplicáveis. |
| PAG-01 | Dados e carteira | Checkout exige sessão, valida os campos do layout e permite revisão. Usa as carteiras cadastradas e a rede selecionada. A conexão, a desconexão e a recusa são simuladas; a recusa da conexão não cria um pedido. |
| PAG-02 | Revisão | O pedido usa a cotação revisada. A API revalida preço, edição, estoque, cupom e taxas antes de aceitar a compra. Se o conteúdo mudar, o usuário recebe a cotação atualizada e deve confirmar novamente. |
| PED-01 | Idempotência | Clique repetido e reenvio após timeout recuperam a mesma tentativa e o mesmo pedido. A chave é vinculada à conta e ao conteúdo da tentativa. Reutilizá-la com outro conteúdo retorna conflito. |
| PED-02 | Estados | Um pedido pode estar pendente, confirmado ou recusado. Atualização da página e reconexão recuperam a tentativa em andamento. Confirmado e recusado são terminais. Falha ou recusa preserva o carrinho. |
| PED-03 | Recibo | A confirmação aparece depois do estado confirmado retornado pela simulação. O recibo usa o snapshot do pedido para itens, quantidade, taxa, desconto, total e identificação simulada da transação. O estoque e o preço futuros não alteram o recibo. Apenas as quantidades compradas saem do carrinho na confirmação, uma única vez. |
| SES-01 | Conta e sessão | Cadastro, login, consulta de sessão, logout e expiração passam pela API. Cadastro valida campos e trata conflito. Login retorna ao fluxo de origem após autenticação. As credenciais de teste são fictícias e a persistência guarda somente verificadores de senha, com salt. |
| SES-02 | Isolamento | Checkout, favoritos, perfil, carteiras e pedidos exigem autenticação. A sessão é recuperada no refresh. Expiração preserva o passo seguro para retomar. Logout e troca de conta descartam cache, operações pendentes e assinaturas da sessão anterior. A API rejeita acesso de outra conta. |
| CON-01 | Perfil | Colecionador consulta e altera dados, avatar e senha. Erros locais e da API são exibidos nos campos correspondentes. Alterações confirmadas persistem após atualizar a página. |
| CON-02 | Carteiras | Colecionador pode cadastrar e editar carteiras principal e secundária. A API valida dados e a seleção no checkout acompanha a configuração persistida da conta. |
| RTX-01 | Eventos | `nft.updated` sincroniza catálogo, detalhe, carrinho e cotação. `order.updated` sincroniza o andamento do pedido da conta proprietária. Ambos carregam ID estável do evento, ID do recurso e versão. |
| RTX-02 | Reconciliação | Duplicatas e versões antigas não reaplicam efeitos. A reconexão consulta novamente os recursos ativos via REST, inclusive pedido pendente, e descarta resultados de uma sessão anterior. Listeners são removidos ao desconectar ou trocar de conta. |
| API-01 | Contratos | Recursos REST tipados cobrem sessão, NFTs, favoritos, carrinho, cotação, pedidos, perfil e carteiras. Os cenários incluem validação, sessão inválida, acesso proibido, recurso inexistente, conflito e falha transitória. |
| MSW-01 | Simulação | Desenvolvimento, demonstração e testes compartilham contratos, fixtures e handlers MSW. O mesmo estado sustenta respostas REST e eventos enviados ao cliente Socket.IO. Simulações têm seleção, reset confiável e pelo menos dois usuários. |
| MSW-02 | Cenários | Reproduzir sucesso, vazio, lentidão, respostas fora de ordem, rede indisponível, HTTP 4xx/5xx, sessão expirada, conflitos, cupom inválido/expirado, mudança de preço/estoque, timeout após criar e confirmação/recusa. |
| UI-01 | Interface | Cobrir todas as telas do enunciado e seus estados. Validar com teclado, foco visível, diálogos e gavetas com gestão de foco, feedback anunciado, labels e mensagens associadas, textos alternativos, contraste, zoom e larguras de 390, 768 e 1440 px. |
| UI-02 | Carregamento | Catálogo, detalhe e resumo do carrinho usam skeletons com dimensões compatíveis e shimmer respeitando movimento reduzido. Tipografia e imagens essenciais ficam disponíveis no build local. |
| ENT-01 | Limites | Páginas editoriais, suporte, atividade, ofertas e downloads ficam fora do escopo funcional. Ações auxiliares e externas têm comportamento coerente, incluindo o que estiver presente no layout. Integrações com blockchain, extensões e pagamentos reais ficam fora do escopo. |

## Situações para validar na demonstração

- **Cotação desatualizada:** adicionar uma edição ao carrinho, revisar o checkout, disparar mudança de preço ou estoque pelo cenário de rede e verificar atualização do resumo e bloqueio da confirmação anterior.
- **Timeout após criação:** repetir o envio da mesma tentativa e retomar após refresh ou reconexão. Conferir que o pedido é o mesmo e que a remoção de itens ocorre somente após confirmar.
- **Troca de conta:** criar favoritos e iniciar um pedido na primeira conta; entrar na segunda e conferir isolamento de itens privados, consultas, mensagens e eventos. Retomar a primeira conta e recuperar seu contexto.
- **Recibo imutável:** confirmar a compra, alterar o catálogo pelo cenário e abrir diretamente o pedido. A comparação usa os valores registrados na compra.
