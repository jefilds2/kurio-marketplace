import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwind(), {
    name: 'preload-demo-worker',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        if (process.env.VITE_ENABLE_MOCKS === 'false') return []
        const mock = Object.values(context.bundle ?? {}).find(
          item => item.type === 'chunk' && item.facadeModuleId?.endsWith('/mocks/browser.ts'),
        )
        return mock ? [{ tag: 'link', attrs: { rel: 'modulepreload', href: '/' + mock.fileName }, injectTo: 'head' }] : []
      },
    },
  }],
})
