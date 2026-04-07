import { useState, useEffect, useRef } from 'react'
import menuData from './data/menu.json'
import './App.css'

// -- CONFIGURACION --
const WHATSAPP_NUMBER = "5491100000000" // Cambiar por el numero real de la caja

function App() {
  const [activeCategory, setActiveCategory] = useState(menuData.categories[0].id)
  const [tableId, setTableId] = useState(null)
  
  // Cart state (Array of distinct items)
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [generalObservations, setGeneralObservations] = useState('')

  // Product Modal State
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productQty, setProductQty] = useState(1)
  const [productObs, setProductObs] = useState('')

  const [isScrolled, setIsScrolled] = useState(false)

  const navRef = useRef(null)

  // Initialization: URL parsing & LocalStorage
  useEffect(() => {
    // 1. Read table from URL
    const params = new URLSearchParams(window.location.search)
    const mesaParam = params.get('mesa')
    if (mesaParam) setTableId(mesaParam)

    // 2. Read Cart from localStorage
    const savedCart = localStorage.getItem('blotbar_cart')
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch (e) {
        console.error("Error parsing cart data")
      }
    }
  }, [])

  // Save Cart to LocalStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('blotbar_cart', JSON.stringify(cart))
  }, [cart])

  // Scroll Spy for Category Nav & Sticky Header Logic
  useEffect(() => {
    const handleScroll = () => {
      // Check if we scrolled past the main logo to show mini logo
      setIsScrolled(window.scrollY > 200)

      // Disable scroll spy when any modal is open
      if (isCartOpen || selectedProduct) return 
      
      const scrollPosition = window.scrollY + 250
      
      for (const category of menuData.categories) {
        const element = document.getElementById(category.id)
        if (element) {
          const { top, bottom } = element.getBoundingClientRect()
          const absoluteTop = window.scrollY + top
          const absoluteBottom = absoluteTop + element.offsetHeight
          
          if (scrollPosition >= absoluteTop && scrollPosition <= absoluteBottom) {
            setActiveCategory(category.id)
            if (navRef.current) {
              const navBtn = document.getElementById(`nav-${category.id}`)
              if (navBtn) {
                const navLeft = navBtn.offsetLeft
                navRef.current.scrollTo({
                  left: navLeft - 20,
                  behavior: 'smooth'
                })
              }
            }
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isCartOpen, selectedProduct])

  const scrollToCategory = (id) => {
    const element = document.getElementById(id)
    if (element) {
      const top = element.getBoundingClientRect().top + window.scrollY - 180
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(price)
  }

  // --- Modal Product Functions ---
  const openProductModal = (item) => {
    setSelectedProduct(item)
    setProductQty(1)
    setProductObs('')
  }

  const closeProductModal = () => {
    setSelectedProduct(null)
  }

  const handleAddToCart = () => {
    const newItem = {
      id: Date.now().toString(),
      item: selectedProduct,
      quantity: productQty,
      obs: productObs.trim()
    }
    
    setCart(prev => [...prev, newItem])
    closeProductModal()
  }

  // --- Cart Functions ---
  const updateCartItemQty = (cartItemId, delta) => {
    setCart(prev => {
      const updatedCart = prev.map(cItem => {
        if (cItem.id === cartItemId) {
          return { ...cItem, quantity: cItem.quantity + delta }
        }
        return cItem
      }).filter(cItem => cItem.quantity > 0)
      
      if (updatedCart.length === 0) setIsCartOpen(false)
      return updatedCart
    })
  }

  const removeCartItem = (cartItemId) => {
    setCart(prev => {
      const newCart = prev.filter(c => c.id !== cartItemId)
      if (newCart.length === 0) setIsCartOpen(false)
      return newCart
    })
  }

  const getTotalItems = () => {
    return cart.reduce((acc, c) => acc + c.quantity, 0)
  }

  const getTotalPrice = () => {
    return cart.reduce((acc, c) => acc + (c.item.price * c.quantity), 0)
  }

  const handleSendWhatsapp = () => {
    let currentTable = tableId
    
    // Safety check if no table in URL
    if (!currentTable) {
      const inputTable = prompt("Mesa no detectada. Ingresá tu número de mesa para realizar el pedido:")
      if (!inputTable || inputTable.trim() === '') return
      currentTable = inputTable.trim()
      setTableId(currentTable)
    }

    let text = `Hola! Quiero hacer un pedido de la *Mesa ${currentTable}*.\n\n`
    text += `*Pedido:*\n`
    
    cart.forEach(cItem => {
      text += `${cItem.quantity} x ${cItem.item.name} (${formatPrice(cItem.item.price * cItem.quantity)})\n`
      if (cItem.obs) {
        text += `   ↳ Obs: ${cItem.obs}\n`
      }
    })

    if (generalObservations.trim() !== '') {
      text += `\n*Nota general:*\n${generalObservations.trim()}\n`
    }

    text += `\n*Total:* ${formatPrice(getTotalPrice())}`

    const encodedText = encodeURIComponent(text)
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedText}`, '_blank')
  }

  return (
    <div className={`app-container animate-fade-in ${(isCartOpen || selectedProduct) ? 'modal-open' : ''}`}>
      
      <header className="hero-header">
        <div className="logo-container">
          <img src="/logo.png" alt="Blot Bar" className="logo-img" />
        </div>
      </header>

      <div className={`category-nav-wrapper ${isScrolled ? 'is-stuck' : ''}`}>
        <div className="nav-top-row">
          <div className="nav-top-left">
             {isScrolled && <img src="/logo.png" alt="Blot" className="nav-mini-logo animate-fade-in-fast" />}
             <div className="table-badge-small">
               {tableId ? `Mesa ${tableId}` : 'Mesa ?'}
             </div>
          </div>
          
          <button className="top-cart-icon" onClick={() => getTotalItems() > 0 && setIsCartOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cart-svg">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            {getTotalItems() > 0 && (
              <span className="cart-badge-small">{getTotalItems()}</span>
            )}
          </button>
        </div>

        <div className="category-scroll" ref={navRef}>
          {menuData.categories.map((cat) => (
            <button
              key={cat.id}
              id={`nav-${cat.id}`}
              className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => scrollToCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <main className="menu-content">
        {menuData.categories.map((category) => (
          <section key={category.id} id={category.id} className="menu-section">
            <h2 className="section-title">{category.name}</h2>
            {category.description && (
              <p className="section-desc">{category.description}</p>
            )}
            
            <div className="items-grid">
              {category.items.map((item, index) => {
                // Check if this specific item model exists at all in the cart to highlight it briefly
                const hasInCart = cart.some(c => c.item.name === item.name)

                return (
                  <article key={index} className={`menu-item ${hasInCart ? 'in-cart' : ''}`}>
                    <div className="item-info">
                      <div className="item-header">
                        <div className="item-title-box">
                           <h3 className="item-name">{item.name}</h3>
                           {item.desc && <p className="item-desc">{item.desc}</p>}
                        </div>
                        <span className="item-price">{formatPrice(item.price)}</span>
                      </div>
                    </div>

                    <div className="item-actions">
                      <button className="add-btn" onClick={() => openProductModal(item)}>
                        Agregar
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ))}
      </main>

      <footer className="app-footer">
        <p>© {new Date().getFullYear()} Blot Bar.</p>
        <p>Desarrollado con ♥ por Southline Studio</p>
      </footer>

      {/* --- PRODUCT CONFIGURATION MODAL --- */}
      {selectedProduct && (
        <div className="cart-modal-overlay animate-fade-in-fast">
          <div className="cart-modal animate-slide-up">
            <div className="cart-modal-header product-modal-head">
              <button className="close-modal-btn bg-dark" onClick={closeProductModal}>✕</button>
            </div>
            
            <div className="product-modal-content">
               <h3 className="product-title">{selectedProduct.name}</h3>
               {selectedProduct.desc && <p className="product-desc">{selectedProduct.desc}</p>}
               <h4 className="product-price">{formatPrice(selectedProduct.price)}</h4>
               
               <div className="product-options">
                  <div className="cart-observations">
                    <label>Aclaraciones especiales (Opcional)</label>
                    <textarea 
                      placeholder="Ej: La quiero doble, sin lechuga, aderezo aparte..."
                      value={productObs}
                      onChange={(e) => setProductObs(e.target.value)}
                      rows={2}
                    ></textarea>
                  </div>
               </div>
            </div>

            <div className="product-modal-footer">
               <div className="qty-controls large">
                  <button className="qty-btn" onClick={() => setProductQty(Math.max(1, productQty - 1))}>-</button>
                  <span className="qty-number">{productQty}</span>
                  <button className="qty-btn" onClick={() => setProductQty(productQty + 1)}>+</button>
               </div>
               
               <button className="add-to-cart-btn" onClick={handleAddToCart}>
                 Añadir ($ {new Intl.NumberFormat('es-AR').format(selectedProduct.price * productQty)})
               </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CHECKOUT MODAL --- */}
      {isCartOpen && (
        <div className="cart-modal-overlay animate-fade-in-fast">
          <div className="cart-modal animate-slide-up">
            <div className="cart-modal-header">
              <h3>Mi Pedido</h3>
              <button className="close-modal-btn" onClick={() => setIsCartOpen(false)}>✕</button>
            </div>
            
            <div className="cart-items-list checkout-list">
              {cart.map((cItem) => (
                <div key={cItem.id} className="checkout-item">
                  <div className="checkout-item-header">
                     <span className="checkout-qty">{cItem.quantity}x</span>
                     <div className="checkout-item-data">
                        <h4>{cItem.item.name}</h4>
                        {cItem.obs && <p className="checkout-obs">↳ {cItem.obs}</p>}
                     </div>
                     <span className="cart-item-price">{formatPrice(cItem.item.price * cItem.quantity)}</span>
                  </div>
                  
                  <div className="checkout-item-actions">
                     <button className="remove-btn" onClick={() => removeCartItem(cItem.id)}>Eliminar</button>
                     <div className="qty-controls small">
                       <button className="qty-btn" onClick={() => updateCartItemQty(cItem.id, -1)}>-</button>
                       <span className="qty-number">{cItem.quantity}</span>
                       <button className="qty-btn" onClick={() => updateCartItemQty(cItem.id, 1)}>+</button>
                     </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-observations global-obs">
              <label>Nota general para el bar (opcional)</label>
              <textarea 
                placeholder="Ej: traer ketchup extra a la mesa"
                value={generalObservations}
                onChange={(e) => setGeneralObservations(e.target.value)}
                rows={1}
              ></textarea>
            </div>

            <div className="cart-modal-footer">
              <div className="cart-total-row">
                <span>Total</span>
                <span className="cart-total-price">{formatPrice(getTotalPrice())}</span>
              </div>
              <button className="send-whatsapp-btn" onClick={handleSendWhatsapp}>
                Finalizar y enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
