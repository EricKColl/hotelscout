import { render, screen } from '@testing-library/react'
import App from '../../src/App'

describe('App', () => {
  it('muestra el nombre de la aplicación', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'HotelScout' })).toBeInTheDocument()
  })
})
