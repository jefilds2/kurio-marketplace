import { Heart, Home, Scan, ShoppingCart, UserRound } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export function NavegacaoMobile({ quantidade, autenticado }: { quantidade: number; autenticado: boolean }) {
  return <nav className="referencia-nav-mobile" aria-label="Navegação mobile">
    <Link to="/" aria-label="Início" className="text-kurio-destaque"><Home size={18} fill="currentColor" /></Link>
    <Link to="/favoritos" aria-label="Favoritos"><Heart size={18} fill="currentColor" /></Link>
    <Link to="/" hash="mercado" className="referencia-nav-centro" aria-label="Explorar NFTs"><Scan size={23} /></Link>
    <Link to="/carrinho" aria-label={`Carrinho com ${quantidade} itens`}><ShoppingCart size={18} fill="currentColor" /></Link>
    <Link to={autenticado ? '/conta/perfil' : '/login'} aria-label="Minha conta"><UserRound size={18} fill="currentColor" /></Link>
  </nav>
}
