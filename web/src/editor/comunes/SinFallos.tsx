import { Component, type ReactNode } from 'react'

/** Si algo de dentro falla al montarse (o al cargarse), muestra `alternativa`. */
export default class SinFallos extends Component<{ alternativa: ReactNode; children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false }
  static getDerivedStateFromError() {
    return { fallo: true }
  }
  render() {
    return this.state.fallo ? this.props.alternativa : this.props.children
  }
}
