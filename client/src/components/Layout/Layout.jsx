import { useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import ThemeApplier from '../Theme/ThemeApplier'

const Layout = ({ children }) => {
  const location = useLocation()
  const isHomePage = location.pathname === '/'

  return (
    <ThemeApplier>
      <div className="min-h-screen flex flex-col">
        {!isHomePage && <Header />}
        
        <main className={`flex-1 ${isHomePage ? '' : 'pt-20'}`}>
          {children}
        </main>
        
        <Footer />
      </div>
    </ThemeApplier>
  )
}

export default Layout
