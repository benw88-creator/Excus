import Header from './components/Header'
import Home from './components/Home'
import Products from './components/Products'
import Footer from './components/Footer'

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Home />
        <Products />
      </main>
      <Footer />
    </>
  )
}
