import { handlePlaces, type ProxyEnv } from '../_lib/proxy'

export const onRequestGet = ({ request, env }: { request: Request; env: ProxyEnv }) =>
  handlePlaces(request, env)
