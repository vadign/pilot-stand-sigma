import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { createNskgortransProxy } from './src/features/public-transport/server/nskgortransProxy'

const nskgortransProxy = createNskgortransProxy()

const reactRefreshPreamblePlugin = (): Plugin => ({
  name: 'sigma-react-refresh-preamble',
  apply: 'serve',
  transformIndexHtml() {
    return [{
      tag: 'script',
      attrs: { type: 'module' },
      children: [
        `import RefreshRuntime from '/@react-refresh'`,
        'RefreshRuntime.injectIntoGlobalHook(window)',
        'window.$RefreshReg$ = () => {}',
        'window.$RefreshSig$ = () => (type) => type',
        'window.__vite_plugin_react_preamble_installed__ = true',
      ].join(';'),
      injectTo: 'head-prepend',
    }]
  },
})

const handleVehiclesRequest = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
  if (!req.url) {
    next()
    return
  }

  const url = new URL(req.url, 'http://localhost')
  if (url.pathname !== '/api/routes' && url.pathname !== '/api/vehicles') {
    next()
    return
  }

  void (async () => {
    try {
      if (url.pathname === '/api/routes') {
        const routes = await nskgortransProxy.getRoutes()
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify(routes))
        return
      }

      const routeId = url.searchParams.get('routeId')
      if (!routeId) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ error: 'routeId is required' }))
        return
      }

      const vehicles = await nskgortransProxy.getVehicles(routeId)
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify(vehicles))
    } catch (error) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: String(error instanceof Error ? error.message : error) }))
    }
  })()
}

const transportVehiclesApiPlugin = (): Plugin => ({
  name: 'sigma-transport-vehicles-api',
  configureServer(server) {
    server.middlewares.use(handleVehiclesRequest)
  },
  configurePreviewServer(server) {
    server.middlewares.use(handleVehiclesRequest)
  },
})

export default defineConfig({
  plugins: [react(), reactRefreshPreamblePlugin(), transportVehiclesApiPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
