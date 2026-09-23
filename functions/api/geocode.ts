import { handleGeocode, type ProxyEnv } from '../_lib/proxy'

export const onRequestGet = ({ request, env }: { request: Request; env: ProxyEnv }) =>
  handleGeocode(request, env)
