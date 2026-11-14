import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { cpus, platform, release } from 'node:os'
import { fileURLToPath } from 'node:url'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'

const base = process.env.KURIO_AUDIT_URL || 'http://127.0.0.1:4174'
const servidor = process.env.KURIO_AUDIT_URL ? null : spawn(process.execPath,
  ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4174', '--strictPort'], { stdio: 'inherit' })
const paginas = { inicio: '/', detalhe: '/nfts/nft-01' }
const categorias = ['performance', 'accessibility', 'best-practices', 'seo']
const metricas = ['largest-contentful-paint', 'cumulative-layout-shift', 'total-blocking-time']
const relatorios = new URL('../reports/lighthouse/', import.meta.url)
const diretorioChrome = process.env.KURIO_CHROME_PATH ?? chromium.executablePath().split(/[\\/]+/).join(process.platform === 'win32' ? '\\' : '/')
const perfilTemporario = mkdtempSync(join(tmpdir(), 'kurio-lighthouse-'))
const browser = spawn(diretorioChrome, [
  '--headless=new', '--disable-extensions', '--remote-debugging-port=9225', '--no-first-run',
  '--no-sandbox', '--disable-dev-shm-usage', '--user-data-dir=' + perfilTemporario,
], { stdio: 'ignore' })
async function aguardar(url) {
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(url)).ok) return } catch { /* Servidor ainda iniciando. */ }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error('Serviço indisponível: ' + url)
}
const mediana = valores => [...valores].sort((a, b) => a - b)[Math.floor(valores.length / 2)]
try {
  await mkdir(fileURLToPath(relatorios), { recursive: true })
  await aguardar(base)
  await aguardar('http://127.0.0.1:9225/json/version')
  const grupos = {}
  let ambiente
  for (const [nome, caminho] of Object.entries(paginas)) {
    for (const perfil of ['mobile', 'desktop']) {
      const prefixo = `${nome}-${perfil}`
      const execucoes = []
      for (let vez = 1; vez <= 3; vez++) {
        process.stdout.write(`Lighthouse ${prefixo} ${vez}/3\n`)
        const resultado = await lighthouse(new URL(caminho, base).href, {
          port: 9225, output: ['html', 'json'], logLevel: 'error', locale: 'pt-BR',
          onlyCategories: categorias,
        }, perfil === 'desktop' ? desktopConfig : undefined)
        if (!resultado || resultado.lhr.runtimeError) throw new Error(resultado?.lhr.runtimeError?.message ?? 'Auditoria indisponível.')
        const { lhr, report } = resultado
        await Promise.all([
          writeFile(new URL(`${prefixo}-${vez}.html`, relatorios), report[0]),
          writeFile(new URL(`${prefixo}-${vez}.json`, relatorios), report[1]),
        ])
        ambiente ??= { lighthouse: lhr.lighthouseVersion, navegador: lhr.environment.hostUserAgent,
          node: process.version, sistema: `${platform()} ${release()}`, cpu: cpus()[0]?.model }
        execucoes.push(Object.fromEntries([
          ...categorias.map(c => [c, Math.round(lhr.categories[c].score * 100)]),
          ...metricas.map(m => [m, lhr.audits[m].numericValue]),
        ]))
      }
      grupos[prefixo] = { execucoes, medianas: Object.fromEntries([...categorias, ...metricas].map(chave =>
        [chave, mediana(execucoes.map(vez => vez[chave]))])) }
    }
  }
  await writeFile(new URL('medianas.json', relatorios), JSON.stringify({ ambiente, base, grupos }, null, 2))
} finally {
  browser.kill()
  servidor?.kill()
  try { rmSync(perfilTemporario, { recursive: true, force: true, maxRetries: 5 }) } catch { /* Chrome pode ainda estar fechando arquivos no Windows. */ }
}
