import { Component, type ReactNode } from 'react'
import Notice from './Notice'

/** Evita que un fallo en un componente (p. ej. el mapa) deje toda la página en blanco. */
export default class ErrorBoundary extends Component<{ children: ReactNode; label: string }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed) {
      return (
        <Notice tone="error" title={`No se pudo mostrar: ${this.props.label}`}>
          El resto de la página sigue funcionando. Recarga la página si quieres volver a intentarlo.
        </Notice>
      )
    }
    return this.props.children
  }
}
