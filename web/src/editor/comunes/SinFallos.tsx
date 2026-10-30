import { Component, type ReactNode } from 'react'

/** Si algo de dentro falla al montarse (o al cargarse), muestra `alternativa` y avisa con `alFallar`. */
export default class SinFallos extends Component<{ alternativa: ReactNode; children: ReactNode; alFallar?: () => void }, { fallo: boolean }> {
  state = { fallo: false }
  static getDerivedStateFromError() {
    return { fallo: true }
  }
  componentDidCatch() {
    this.props.alFallar?.()
  }
  render() {
    return this.state.fallo ? this.props.alternativa : this.props.children
  }
}
