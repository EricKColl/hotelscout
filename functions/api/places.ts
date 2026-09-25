import { defaultDeps, handlePlaces, type ProxyEnv } from '../_lib/proxy'

interface PagesContext {
  request: Request
  env: ProxyEnv
  waitUntil(promise: Promise<unknown>): void
}

export const onRequestGet = (context: PagesContext) =>
  handlePlaces(context.request, context.env, { ...defaultDeps(), waitUntil: (p) => context.waitUntil(p) })
