# Resultados da validação do KURIO

Build otimizado servido localmente, com MSW habilitado e cenário padrão. O Lighthouse fez três medições por página e perfil com suas configurações padrão de simulação.

Lighthouse 13.6.0, Chrome 157 headless, Node v26.11.1 e Windows 10.0.26300 em AMD Ryzen 5 7535HS.

| Página | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início mobile | 77 | 96 | 96 | 100 | 4,31 s | 0,000 | 371 ms |
| Início desktop | 99 | 96 | 96 | 100 | 0,90 s | 0,002 | 10 ms |
| Detalhe mobile | 78 | 100 | 96 | 100 | 4,12 s | 0,027 | 357 ms |
| Detalhe desktop | 99 | 97 | 96 | 100 | 0,88 s | 0,001 | 8 ms |

As metas do desafio são 90 para performance e SEO e 95 para acessibilidade e boas práticas. No mobile, o atraso na exibição da maior imagem e o bloqueio da thread principal pesaram na nota de performance. A auditoria registra a inicialização do aplicativo, a camada de mocks e a construção da interface. Os relatórios HTML e JSON contêm as medições e os diagnósticos individuais.

## Testes e referências

Playwright em Chromium teve 33 testes aprovados e zero falhas. A repetição do teste de tablet no perfil mobile foi omitida, pois o mesmo teste rodou em 768 px no perfil desktop. Os oito snapshots das quatro telas principais estão em tests/visual.spec.ts-snapshots.

Sete HTMLs e três CSS em src/referencias reproduzem byte a byte os arquivos da pasta Desafio. O layout mobile foi comparado com os seis prints fornecidos. O comparativo mostra diferenças de espaçamento, enquadramento e dados simulados entre o build e a referência. As baselines automatizadas verificam regressões do build.

## Publicação

Os arquivos de deploy estão em dist/ e no ZIP para upload manual. O repositório Git local e o build estão disponíveis na pasta Desktop/KURIO. O envio pelo GitHub e a publicação pública no Netlify seguem manuais.
