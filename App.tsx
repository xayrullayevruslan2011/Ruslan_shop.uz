
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Home, Search, Grid, User as UserIcon, ShoppingCart, Star, ChevronLeft, 
  MessageCircle, Send, Plus, Lock, LogOut, Camera, 
  X, ShieldCheck, Package, Layers, Sun, Moon, Globe, Copy, Users, 
  Settings, Check, Truck, UserPlus, Info, Zap, BarChart3, HelpCircle,
  CreditCard, Loader2, Image as ImageIcon, Edit3, Save, Play, PlusCircle, Trash2, Video, ClipboardList, Ban, UploadCloud, Share2, Bell, MapPin, QrCode, Receipt,
  Flame, Leaf, Sparkles, Palette, Smartphone, Armchair, Compass
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Product, View, User, Language, Order, Banner } from './types';
import { INITIAL_PRODUCTS, MARKUP_RATE, CURRENCY_RATE, CARD_NUMBER, CARD_OWNER } from './constants';

const TELEGRAM_TOKEN = '8543158894:AAHkaN83tLCgNrJ-Omutn744aTui784GScc';
const ADMIN_ID_MATCH = '8215056224'; 
const ADMIN_SECRET_CODE = '2011';
const MAIN_REF_LINK = "https://t.me/ruslan_market_bot?start=8215056224";

const CLICK_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3";

const translations = {
  uz: {
    welcome: "Ruslan | Shop",
    mallDesc: "Xitoydan (1688, Taobao) tovar keltirish",
    authBtn: "Bot orqali kodni olish",
    back: "Orqaga",
    home: "Asosiy",
    catalog: "Katalog",
    search: "Qidiruv",
    profile: "Profil",
    orders: "Buyurtmalar",
    referral: "Hamkorlik",
    price: "Narxi",
    buy: "Xarid qilish",
    share: "Ulashish",
    size: "Variant",
    track: "Trek",
    paid: "To'landi",
    pending: "Kutilmoqda",
    verifying: "Tekshirilmoqda",
    shipped: "Yo'lda",
    delivered: "Yetib keldi",
    copied: "Nusxalandi",
    paymentTitle: "To'lov ma'lumotlari",
    uploadReceipt: "Chek rasmini yuklash",
    confirmPayment: "To'lovni tasdiqlash",
    verifyingPayment: "To'lov tekshirilmoqda...",
    bio: "Men haqimda",
    editProfile: "Profilni tahrirlash",
    userList: "Foydalanuvchilar",
    addProduct: "Yangi mahsulot qo'shish",
    manageOrders: "Buyurtmalarni boshqarish",
    telegramId: "Telegram ID",
    phoneNumber: "Telefon raqami",
    cart: "Savat",
    addToCart: "Savatga qo'shish",
    emptyCart: "Savat bo'sh",
    checkout: "To'lovga o'tish",
    total: "Jami",
    address: "Yetkazib berish manzili",
    enterAddress: "Viloyat, tuman, ko'cha, uy raqami",
    receipt: "Chek",
    viewReceipt: "Chekni ko'rish",
    orderDate: "Sana",
    orderId: "Buyurtma ID",
    paymentStatus: "To'lov holati",
    scanQR: "QR kodni skanerlang",
    adminOrders: "Barcha buyurtmalar"
  }
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('uz');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currentView, setCurrentView] = useState<View>('loading');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [pendingOrderData, setPendingOrderData] = useState<{product: Product, size: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<{id: string, message: string, type: string}[]>([]);
  const [address, setAddress] = useState('');
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };
  const [generatedCode, setGeneratedCode] = useState('');
  const [tempAuthData, setTempAuthData] = useState<{username: string, telegramId: string, phoneNumber?: string, isAdmin?: boolean} | null>(null);
  const [cart, setCart] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('ruslan_shop_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  
  const t = translations['uz'];

  const playClickSound = () => {
    const audio = new Audio(CLICK_SOUND_URL);
    audio.volume = 0.4;
    audio.play().catch(() => {});
  };

  useEffect(() => {
    localStorage.setItem('ruslan_shop_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    document.body.parentElement!.className = theme;
  }, [theme]);

  // Loading screen logic
  useEffect(() => {
    if (currentView === 'loading') {
      const timer = setTimeout(() => {
        try {
          const saved = localStorage.getItem('ruslan_shop_user');
          if (saved) {
            setCurrentUser(JSON.parse(saved));
            setCurrentView('home');
          } else {
            setCurrentView('auth');
          }
        } catch (e) {
          console.error('Failed to parse current user:', e);
          setCurrentView('auth');
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentView]);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);

  const sendTelegramNotification = async (message: string) => {
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
    } catch (e) {
      console.error('Notification error:', e);
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch('/api/data');
      const data = await res.json();
      if (data.products && data.products.length > 0) setAllProducts(data.products);
      if (data.users) setAllUsers(data.users);
      if (data.orders) setOrders(data.orders);
      if (data.banners) setBanners(data.banners);
    } catch (e) {
      console.error('Failed to fetch data:', e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Sync every 10s
    return () => clearInterval(interval);
  }, []);

  const filteredProducts = allProducts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    localStorage.setItem('ruslan_shop_products', JSON.stringify(allProducts));
    localStorage.setItem('ruslan_shop_orders', JSON.stringify(orders));
    localStorage.setItem('ruslan_shop_all_users', JSON.stringify(allUsers));
    if (currentUser) {
      localStorage.setItem('ruslan_shop_user', JSON.stringify(currentUser));
    }
  }, [allProducts, orders, currentUser, allUsers]);

  const handleStartAuth = async (data: {username: string, phoneNumber: string, secretCode?: string}) => {
    const isAdminMode = data.username.toLowerCase().trim() === 'admin' && data.secretCode === ADMIN_SECRET_CODE;
    
    const newUser: User = {
      username: data.username || 'Mijoz',
      telegramId: data.phoneNumber,
      phoneNumber: data.phoneNumber,
      isAdmin: isAdminMode,
      referralBalance: 0,
      invitedCount: 0,
      bio: isAdminMode ? 'Administrator' : 'Xush kelibsiz!',
      avatar: `https://i.pravatar.cc/150?u=${data.phoneNumber}`
    };

    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      setCurrentUser(newUser);
      localStorage.setItem('ruslan_shop_user', JSON.stringify(newUser));
      
      // Notify Admin via Telegram
      await sendTelegramNotification(`🆕 Yangi foydalanuvchi ro'yxatdan o'tdi:\n👤 Ism: ${data.username}\n📱 Tel: ${data.phoneNumber}`);
      
      notify("Xush kelibsiz!", "success");
      setCurrentView('home');
    } catch (e) {
      notify("Xatolik yuz berdi", "error");
    }
  };

  const processPayment = async (receiptImage: string, address: string) => {
    if (!currentUser || !pendingOrderData) return;
    const { product, size } = pendingOrderData;
    
    const newOrder: Order = {
      id: 'RUS-' + Date.now().toString().slice(-6),
      userId: currentUser.telegramId,
      username: currentUser.username,
      productId: product.id,
      productName: product.name,
      size,
      price: product.pinduoduoPrice * MARKUP_RATE * CURRENCY_RATE,
      status: 'verifying',
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
      receiptImage: receiptImage,
      address: address
    };

    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
      setOrders([newOrder, ...orders]);
      await sendTelegramNotification(`💸 *To'lov Tasdiqlashga Keldi*\n📦 Tovar: ${product.name}\n💰 Narx: ${newOrder.price.toLocaleString()} UZS\n👤 Foydalanuvchi: ${currentUser.username}\n📍 Manzil: ${address}\n🆔 TG ID: ${currentUser.telegramId}\n🆔 Buyurtma: ${newOrder.id}`);
      notify("To'lov yuborildi, tekshirilmoqda", "success");
      setReceiptOrder(newOrder);
      setCurrentView('receipt');
    } catch (e) {
      notify("Buyurtma berishda xatolik", "error");
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status'], trackNumber?: string) => {
    const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status, trackNumber: trackNumber || o.trackNumber } : o);
    setOrders(updatedOrders);
    try {
      await fetch('/api/orders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status, trackNumber })
      });
      notify("Buyurtma yangilandi", "success");
    } catch (e) {
      console.error('Failed to update order status:', e);
      notify("Xatolik yuz berdi", "error");
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!window.confirm("Buyurtmani o'chirmoqchimisiz?")) return;
    const updatedOrders = orders.filter(o => o.id !== orderId);
    setOrders(updatedOrders);
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE'
      });
      notify("Buyurtma o'chirildi", "info");
    } catch (e) {
      console.error('Failed to delete order:', e);
      notify("Xatolik yuz berdi", "error");
    }
  };

  const addToCart = (product: Product, size: string) => {
    playClickSound();
    const newItem = {
      id: Date.now().toString(),
      product,
      size,
      quantity: 1
    };
    setCart([...cart, newItem]);
    notify("Savatga qo'shildi!", "success");
  };

  const removeFromCart = (id: string) => {
    playClickSound();
    setCart(cart.filter(item => item.id !== id));
    notify("Savatdan olib tashlandi", "info");
  };

  const navigate = (view: View) => {
    playClickSound();
    setCurrentView(view);
  };

  if (currentView === 'loading') return <LoadingView />;

  return (
    <div className={`min-h-screen pb-24 transition-colors ${theme === 'dark' ? 'bg-[#0B0F1A] text-white' : 'bg-[#F3F4F6] text-slate-900'}`}>
      {currentUser && (
        <header className="sticky top-0 z-50 glass-nav px-6 py-4 border-b border-slate-200/20 flex justify-between items-center shadow-sm">
          <div className="flex items-center space-x-2" onClick={() => navigate('home')}>
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg"><Zap size={20} className="text-white" /></div>
            <h1 className="font-extrabold text-xl tracking-tighter text-blue-600 dark:text-blue-400">Ruslan | Shop</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={() => { playClickSound(); navigate('search'); }} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 transition-all">
              <Search size={18} />
            </button>
            <button onClick={() => { playClickSound(); setTheme(theme === 'light' ? 'dark' : 'light'); }} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 transition-all">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} className="text-amber-400" />}
            </button>
            <button onClick={() => navigate('cart')} className="p-2 relative text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <ShoppingCart size={20} />
              {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cart.length}</span>}
            </button>
            {currentUser.isAdmin && (
              <button onClick={() => navigate('user_search')} className="p-2 text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded-lg"><Users size={20} /></button>
            )}
          </div>
        </header>
      )}

      <main className="max-w-md mx-auto fade-in">
        {currentView === 'auth' && <AuthView t={t} onStart={(d:any) => { playClickSound(); handleStartAuth(d); }} playSound={playClickSound} />}
        
        {currentUser && (
          <>
            {currentView === 'home' && <HomeView t={t} onProductClick={(p:any) => { playClickSound(); setSelectedProduct(p); navigate('detail'); }} products={allProducts} banners={banners} onNavigate={navigate} isAdmin={currentUser.isAdmin} />}
            {currentView === 'catalog' && <CatalogView t={t} products={allProducts} onProductClick={(p:any) => { playClickSound(); setSelectedProduct(p); navigate('detail'); }} />}
            {currentView === 'search' && <SearchView t={t} query={searchQuery} setQuery={setSearchQuery} results={filteredProducts} onProductClick={(p:any) => { playClickSound(); setSelectedProduct(p); navigate('detail'); }} />}
            {currentView === 'profile' && <ProfileView t={t} user={currentUser} setUser={setCurrentUser} onLogout={() => { playClickSound(); localStorage.removeItem('ruslan_shop_user'); setCurrentUser(null); navigate('auth'); }} onNavigate={navigate} playSound={playClickSound} />}
            {currentView === 'orders' && <OrdersView t={t} orders={orders.filter(o => o.userId === currentUser.telegramId)} onNavigate={navigate} setReceiptOrder={setReceiptOrder} />}
            {currentView === 'referral' && <ReferralView t={t} user={currentUser} playSound={playClickSound} notify={notify} />}
            {currentView === 'detail' && selectedProduct && <DetailView t={t} product={selectedProduct} onBack={() => navigate('catalog')} onOrder={(p:any, sz:any) => { playClickSound(); setPendingOrderData({product:p, size:sz}); navigate('payment'); }} onAddToCart={addToCart} playSound={playClickSound} />}
            {currentView === 'payment' && pendingOrderData && <PaymentView t={t} product={pendingOrderData.product} onConfirm={(r:any, addr:any) => { playClickSound(); processPayment(r, addr); }} onBack={() => navigate('detail')} playSound={playClickSound} />}
            {currentView === 'receipt' && <ReceiptView t={t} order={receiptOrder} onBack={() => navigate('orders')} playSound={playClickSound} />}
            {currentView === 'manage_orders' && <AdminOrdersView t={t} orders={orders} onUpdateStatus={updateOrderStatus} onDelete={deleteOrder} onBack={() => navigate('profile')} playSound={playClickSound} />}
            {currentView === 'manage_banners' && <ManageBannersView banners={banners} onUpdate={setBanners} onBack={() => navigate('profile')} playSound={playClickSound} notify={notify} />}
            {currentView === 'manage_products' && <ManageProductsView products={allProducts} onEdit={(p) => { setProductToEdit(p); navigate('admin_add_product'); }} onDelete={async (id) => { if(window.confirm("O'chirilsinmi?")) { try { await fetch(`/api/products/${id}`, { method: 'DELETE' }); setAllProducts(allProducts.filter(p => p.id !== id)); notify("O'chirildi", "info"); } catch(e) { notify("Xatolik", "error"); } } }} onBack={() => navigate('profile')} playSound={playClickSound} />}
            {currentView === 'user_search' && <UserSearchView users={allUsers} onBack={() => navigate('home')} playSound={playClickSound} />}
            {currentView === 'admin_add_product' && <AdminAddProductView productToEdit={productToEdit} onAdd={(p:any) => { setAllProducts(prev => { const idx = prev.findIndex(x => x.id === p.id); if(idx > -1) { const n = [...prev]; n[idx] = p; return n; } return [p, ...prev]; }); notify(productToEdit ? "Yangilandi!" : "Mahsulot qo'shildi!", "success"); setProductToEdit(null); navigate('manage_products'); }} onBack={() => { setProductToEdit(null); navigate('profile'); }} playSound={playClickSound} notify={notify} />}
            {currentView === 'cart' && <CartView t={t} cart={cart} onRemove={removeFromCart} onCheckout={(item:any) => { playClickSound(); setPendingOrderData({product: item.product, size: item.size}); navigate('payment'); }} onBack={() => navigate('home')} playSound={playClickSound} />}
          </>
        )}
      </main>

      {currentUser && (
        <nav className="fixed bottom-0 left-0 right-0 glass-nav h-20 flex justify-around items-center px-4 z-50 border-t border-slate-200/10">
          <NavButton icon={<Home size={24} />} label={t.home} active={currentView === 'home'} onClick={() => navigate('home')} />
          <NavButton icon={<Grid size={24} />} label={t.catalog} active={currentView === 'catalog'} onClick={() => navigate('catalog')} />
          <NavButton icon={<Search size={24} />} label={t.search} active={currentView === 'search'} onClick={() => navigate('search')} />
          <NavButton icon={<ShoppingCart size={24} />} label={t.cart} active={currentView === 'cart'} onClick={() => navigate('cart')} />
          <NavButton 
            icon={
              <div className="relative">
                <UserIcon size={24} />
                {currentUser.isAdmin && <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />}
              </div>
            } 
            label={t.profile} 
            active={currentView === 'profile'} 
            onClick={() => navigate('profile')} 
          />
        </nav>
      )}

      {/* Notifications */}
      <div className="fixed top-20 right-4 z-[200] space-y-2 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className={`p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 duration-300 pointer-events-auto ${
            n.type === 'success' ? 'bg-emerald-600 text-white' : 
            n.type === 'error' ? 'bg-red-600 text-white' : 
            'bg-blue-600 text-white'
          }`}>
            {n.type === 'success' && <Check size={18} />}
            {n.type === 'error' && <Ban size={18} />}
            {n.type === 'info' && <Bell size={18} />}
            <span className="text-xs font-bold uppercase tracking-wider">{n.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* --- Sub-Components --- */

const LoadingView = () => (
  <div className="min-h-screen bg-white dark:bg-[#0B0F1A] flex flex-col items-center justify-center p-8 text-center">
    <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl animate-bounce mb-8">
      <Zap size={48} className="text-white fill-current" />
    </div>
    <h1 className="text-4xl font-black text-blue-600 dark:text-blue-400 tracking-tighter mb-2">Ruslan | Shop</h1>
    <p className="text-slate-400 font-medium animate-pulse">Platformaga kirilmoqda...</p>
  </div>
);

const AuthView = ({ t, onStart, playSound }: any) => {
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+998');
  const [secretCode, setSecretCode] = useState('');
  const [loading, setLoading] = useState(false);
  const isAdmin = username.toLowerCase() === 'admin';

  const handleSubmit = async () => {
    if (phoneNumber.length < 12) {
      alert("Telefon raqamini to'liq kiriting!");
      return;
    }
    playSound();
    setLoading(true);
    // We pass an empty string for telegramId since we are using SMS now
    await onStart({username, telegramId: '', phoneNumber, secretCode});
    setLoading(false);
  };

  return (
    <div className="p-8 min-h-screen flex flex-col justify-center">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-blue-500/30"><Layers size={40} className="text-white" /></div>
        <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter">Ruslan | Shop</h2>
        <p className="text-slate-500 text-sm font-medium">{t.mallDesc}</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase px-2">Ism yoki Username</label>
          <input className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Misol: Ruslan" value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase px-2">{t.phoneNumber}</label>
          <input className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="+998 90 123 45 67" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
        </div>
        
        {isAdmin && (
          <div className="space-y-1 animate-in slide-in-from-top-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase px-2">Admin Paroli</label>
            <input type="password" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="****" value={secretCode} onChange={e => setSecretCode(e.target.value)} />
          </div>
        )}

        <button 
          onClick={handleSubmit} 
          disabled={loading}
          className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all mt-4 uppercase tracking-widest disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
          Kirish
        </button>
      </div>
    </div>
  );
};

const BannerItem = ({ banner, onNavigate }: any) => (
  <div className="relative bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] p-8 md:p-12 overflow-hidden flex flex-col md:flex-row items-center justify-between shadow-sm border border-slate-200/50 dark:border-slate-700/50 min-h-[250px]">
    <div className="relative z-10 space-y-4 max-w-md">
      <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-indigo-600 dark:text-indigo-400 leading-[0.9] whitespace-pre-line">{banner.title}</h2>
      <p className="text-slate-600 dark:text-slate-400 text-sm font-medium max-w-[250px]">{banner.subtitle}</p>
      <button onClick={() => onNavigate(banner.link || 'catalog')} className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-sm uppercase tracking-tight group">
        to'plamga o'tish <ChevronLeft size={16} className="rotate-180 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
    <div className="relative mt-8 md:mt-0 flex items-center justify-center">
      <img src={banner.image} className="w-48 md:w-64 drop-shadow-2xl rotate-12 hover:rotate-0 transition-transform duration-500 rounded-2xl" alt="Banner" />
      <div className="absolute -bottom-4 -left-4 bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-xl flex items-center gap-3 animate-bounce">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white"><Zap size={20} /></div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase">Aksiya</p>
          <p className="text-xs font-black">-30% GACHA</p>
        </div>
      </div>
    </div>
  </div>
);

const CategoryList = ({ onNavigate }: any) => {
  const categories = [
    { name: "Hafta tovarlari", icon: <Flame size={18} className="text-orange-500" /> },
    { name: "Bahorgi kolleksiya", icon: <Leaf size={18} className="text-emerald-500" /> },
    { name: "Sizning go'zalligingiz", icon: <Sparkles size={18} className="text-pink-500" /> },
    { name: "Xobbi va ijod", icon: <Palette size={18} className="text-indigo-500" /> },
    { name: "Smartfonlari", icon: <Smartphone size={18} className="text-blue-500" /> },
    { name: "Ramazon oyi", icon: <Moon size={18} className="text-amber-500" /> },
    { name: "Mebel", icon: <Armchair size={18} className="text-stone-500" /> },
    { name: "Turizm va baliq", icon: <Compass size={18} className="text-cyan-500" /> },
  ];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar px-2">
      {categories.map((cat, idx) => (
        <button 
          key={idx} 
          onClick={() => onNavigate('catalog')}
          className="flex-shrink-0 flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-blue-500 transition-colors"
        >
          {cat.icon}
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">{cat.name}</span>
        </button>
      ))}
      <button className="flex-shrink-0 flex items-center gap-1 text-[11px] font-bold text-slate-400 px-2">
        Yana <ChevronLeft size={14} className="rotate-270" />
      </button>
    </div>
  );
};

const HomeView = ({ t, products, banners, onProductClick, onNavigate, isAdmin }: any) => (
  <div className="p-6 space-y-8">
    <div className="flex justify-between items-center">
      <CategoryList onNavigate={onNavigate} />
      {isAdmin && (
        <button onClick={() => onNavigate('profile')} className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl flex items-center gap-2 font-black text-[10px] uppercase tracking-tighter shadow-sm border border-red-100 dark:border-red-900/30">
          <ShieldCheck size={14} />
          Admin
        </button>
      )}
    </div>
    
    <div className="space-y-6">
      {banners && banners.length > 0 ? (
        banners.map((b: Banner) => <BannerItem key={b.id} banner={b} onNavigate={onNavigate} />)
      ) : (
        <div className="bg-blue-600 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-4xl font-black tracking-tighter mb-4 leading-none">Xitoy Mahsulotlari Ostonangizda</h2>
            <p className="text-blue-100 text-sm mb-8 opacity-80 max-w-[200px]">1688, Taobao va Pinduoduo platformalaridan eng arzon narxlar.</p>
            <button onClick={() => onNavigate('catalog')} className="bg-white text-blue-600 px-8 py-3 rounded-2xl font-black text-sm uppercase shadow-xl hover:scale-105 transition-transform">Xaridni boshlash</button>
          </div>
          <div className="absolute -bottom-12 -right-12 opacity-10"><Package size={240} /></div>
        </div>
      )}
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] text-center space-y-3 shadow-sm">
        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/40 rounded-2xl flex items-center justify-center mx-auto"><Truck className="text-blue-600" size={24}/></div>
        <p className="font-bold text-sm">Logistika</p>
        <p className="text-[10px] text-slate-400">7-15 kunlik yetkazish</p>
      </div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] text-center space-y-3 shadow-sm">
        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/40 rounded-2xl flex items-center justify-center mx-auto"><ShieldCheck className="text-emerald-600" size={24}/></div>
        <p className="font-bold text-sm">Ishonchli</p>
        <p className="text-[10px] text-slate-400">100% Sug'urta</p>
      </div>
    </div>

    <div>
      <div className="flex justify-between items-center mb-6 px-2">
        <h3 className="font-black text-2xl tracking-tight">Ommabop Tovarar</h3>
        <button onClick={() => onNavigate('catalog')} className="text-blue-600 text-xs font-black uppercase">Hammasi</button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {products.length > 0 ? (
          products.slice(0, 4).map((p: any) => <ProductCard key={p.id} product={p} onClick={() => onProductClick(p)} />)
        ) : (
          <div className="col-span-2 py-10 text-center text-slate-400 italic bg-white dark:bg-slate-800 rounded-3xl">Katalog hali bo'sh...</div>
        )}
      </div>
    </div>
  </div>
);

const DetailView = ({ t, product, onBack, onOrder, onAddToCart, playSound }: any) => {
  const [activeMedia, setActiveMedia] = useState(0);
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || 'Standard');
  const mediaItems = [...product.images, ...(product.videos || [])];

  const isVideo = (url: string) => url.includes('.mp4') || url.startsWith('data:video');

  const handleShare = async () => {
    playSound();
    const shareText = `Ruslan | Shop: ${product.name}\nNarxi: ${(product.pinduoduoPrice * MARKUP_RATE * CURRENCY_RATE).toLocaleString()} UZS\nKategoriya: ${product.category}\n\nBatafsil ma'lumot botimizda: ${MAIN_REF_LINK}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: shareText,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(MAIN_REF_LINK)}&text=${encodeURIComponent(shareText)}`;
      window.open(tgUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <div className="h-96 relative bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
        {isVideo(mediaItems[activeMedia]) ? (
          <video src={mediaItems[activeMedia]} controls autoPlay className="h-full w-full object-contain" />
        ) : (
          <img src={mediaItems[activeMedia]} className="max-h-full max-w-full object-contain p-4 drop-shadow-2xl" />
        )}
        <button onClick={() => { playSound(); onBack(); }} className="absolute top-6 left-6 p-3 bg-white/90 dark:bg-slate-800/90 rounded-2xl shadow-xl z-20"><ChevronLeft size={24} /></button>
        <button onClick={handleShare} className="absolute top-6 right-6 p-3 bg-white/90 dark:bg-slate-800/90 rounded-2xl shadow-xl z-20"><Share2 size={24} className="text-blue-600" /></button>
      </div>

      <div className="flex gap-2 p-4 overflow-x-auto bg-slate-50 dark:bg-slate-800/50">
        {mediaItems.map((item, idx) => (
          <button 
            key={idx} 
            onClick={() => { playSound(); setActiveMedia(idx); }}
            className={`flex-shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden relative ${activeMedia === idx ? 'border-blue-600' : 'border-transparent opacity-60'}`}
          >
            {isVideo(item) ? (
              <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                <Play size={16} className="text-white fill-current" />
              </div>
            ) : (
              <img src={item} className="w-full h-full object-cover" />
            )}
          </button>
        ))}
      </div>

      <div className="p-8 -mt-6 bg-white dark:bg-slate-900 rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] relative z-10 space-y-6 pb-32">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-black tracking-tight">{product.name}</h1>
          <div className="flex items-center space-x-1 text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-xl font-black text-sm">
            <Star size={16} fill="currentColor" /> <span>{product.rating}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            {product.oldPrice && (
              <div className="flex items-center gap-2">
                <p className="text-sm text-slate-400 line-through font-bold">
                  {(product.oldPrice * MARKUP_RATE * CURRENCY_RATE).toLocaleString()} UZS
                </p>
                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-lg">
                  -{Math.round((1 - product.pinduoduoPrice / product.oldPrice) * 100)}%
                </span>
              </div>
            )}
            <p className="text-4xl font-black text-blue-600">{(product.pinduoduoPrice * MARKUP_RATE * CURRENCY_RATE).toLocaleString()} UZS</p>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg uppercase self-start mt-2">{product.category}</span>
        </div>
        <p className="text-slate-500 text-sm leading-relaxed font-medium">{product.description}</p>
        
        <div className="space-y-3">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t.size}</p>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s:string) => (
              <button 
                key={s} 
                onClick={() => { playSound(); setSelectedSize(s); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${selectedSize === s ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <button onClick={() => onOrder(product, selectedSize)} className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-3 active:scale-95 transition-all text-lg">
            <CreditCard size={24} /> <span>{t.buy}</span>
          </button>
          <button onClick={() => onAddToCart(product, selectedSize)} className="w-full py-4 bg-emerald-600 text-white font-black rounded-3xl flex items-center justify-center gap-3 active:scale-95 transition-all">
            <PlusCircle size={20} /> <span>{t.addToCart}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const CartView = ({ t, cart, onRemove, onCheckout, onBack, playSound }: any) => {
  const total = cart.reduce((acc: number, item: any) => acc + (item.product.pinduoduoPrice * MARKUP_RATE * CURRENCY_RATE), 0);

  return (
    <div className="p-8 space-y-8 pb-32">
      <div className="flex items-center gap-4">
        <button onClick={() => { playSound(); onBack(); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl"><ChevronLeft size={20}/></button>
        <h2 className="text-2xl font-black">{t.cart}</h2>
      </div>

      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
          <ShoppingCart size={64} strokeWidth={1} />
          <p className="font-bold">{t.emptyCart}</p>
          <button onClick={() => { playSound(); onBack(); }} className="text-blue-600 font-black uppercase text-xs">Xaridni boshlash</button>
        </div>
      ) : (
        <div className="space-y-4">
          {cart.map((item: any) => (
            <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-3xl flex items-center gap-4 shadow-sm">
              <img src={item.product.images[0]} className="w-20 h-20 rounded-2xl object-cover" />
              <div className="flex-1">
                <h4 className="font-bold text-sm">{item.product.name}</h4>
                <p className="text-[10px] text-slate-400">{item.size}</p>
                <p className="font-black text-blue-600 mt-1">{(item.product.pinduoduoPrice * MARKUP_RATE * CURRENCY_RATE).toLocaleString()} UZS</p>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => { playSound(); onCheckout(item); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Play size={16}/></button>
                <button onClick={() => { playSound(); onRemove(item.id); }} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}

          <div className="bg-blue-600 p-6 rounded-[2rem] text-white space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <span className="font-bold opacity-80">{t.total}:</span>
              <span className="text-2xl font-black">{total.toLocaleString()} UZS</span>
            </div>
            <p className="text-[10px] opacity-60 text-center italic">Buyurtmalar alohida-alohida to'lanadi</p>
          </div>
        </div>
      )}
    </div>
  );
};

const PaymentView = ({ t, product, onConfirm, onBack, playSound }: any) => {
  const [receipt, setReceipt] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    playSound();
    if (!file.type.startsWith('image/')) {
      alert("Iltimos, faqat rasm yuklang!");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setReceipt(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleConfirm = () => {
    playSound();
    if (!address.trim()) return alert("Iltimos, yetkazib berish manzilini kiriting!");
    if (!receipt) return alert("Iltimos, avval chek rasmini yuklang!");
    setIsSimulating(true);
    const duration = 5000 + Math.random() * 5000;
    const step = 100;
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          onConfirm(receipt, address);
          return 100;
        }
        return p + (step / duration) * 100;
      });
    }, step);
  };

  if (isSimulating) {
    return (
      <div className="p-8 min-h-screen flex flex-col items-center justify-center text-center space-y-8">
        <div className="relative">
          <Loader2 className="w-32 h-32 text-blue-500 animate-spin" strokeWidth={1} />
          <div className="absolute inset-0 flex items-center justify-center font-black text-2xl">{Math.round(progress)}%</div>
        </div>
        <div>
          <h2 className="text-2xl font-black mb-2">{t.verifyingPayment}</h2>
          <p className="text-slate-400 text-sm">Tizim to'lovni avtomatik tekshirmoqda. Iltimos, sahifani yopmang.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 pb-32">
      <div className="flex items-center gap-4">
        <button onClick={() => { playSound(); onBack(); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl"><ChevronLeft size={20}/></button>
        <h2 className="text-2xl font-black">{t.paymentTitle}</h2>
      </div>

      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2rem] p-8 text-white shadow-2xl space-y-6 relative overflow-hidden">
        <CreditCard className="absolute -top-6 -right-6 w-32 h-32 opacity-10" />
        <div className="flex justify-between">
          <div className="w-12 h-10 bg-amber-400/50 rounded-lg"></div>
          <p className="text-xl font-black italic tracking-widest">UZCARD</p>
        </div>
        <p className="text-2xl font-mono tracking-[0.2em]">{CARD_NUMBER}</p>
        <div className="flex justify-between items-end">
          <p className="font-bold uppercase tracking-widest text-sm">{CARD_OWNER}</p>
          <button onClick={() => { playSound(); navigator.clipboard.writeText(CARD_NUMBER); alert(t.copied); }} className="p-2 bg-white/20 rounded-lg"><Copy size={16}/></button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase px-2">{t.address}</label>
          <textarea 
            className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" 
            placeholder={t.enterAddress}
            rows={3}
            value={address}
            onChange={e => setAddress(e.target.value)}
          />
        </div>

        <div className="flex justify-between items-center text-sm font-bold">
          <span className="text-slate-400 uppercase">To'lov miqdori:</span>
          <span className="text-2xl font-black text-blue-600">{(product.pinduoduoPrice * MARKUP_RATE * CURRENCY_RATE).toLocaleString()} UZS</span>
        </div>
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase text-center">{t.uploadReceipt}</p>
          <label 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-3xl cursor-pointer transition-all relative overflow-hidden ${
              isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
          >
            {receipt ? (
              <div className="absolute inset-0 group">
                <img src={receipt} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <UploadCloud className="text-white" size={32} />
                  <span className="text-white font-bold text-xs ml-2">Rasmni almashtirish</span>
                </div>
              </div>
            ) : (
              <>
                <div className={`p-4 rounded-full mb-3 transition-colors ${isDragging ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                  <UploadCloud size={32} />
                </div>
                <div className="text-center px-4">
                  <p className="text-sm font-black text-slate-700 dark:text-slate-200">Rasm tanlang yoki shu yerga tashlang</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">PNG, JPG formatlar</p>
                </div>
              </>
            )}
            <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
          </label>
        </div>
        <button onClick={handleConfirm} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all">
          <Check size={20}/> {t.confirmPayment}
        </button>
      </div>
    </div>
  );
};

const ReceiptView = ({ t, order, onBack, playSound }: any) => {
  if (!order) return null;
  return (
    <div className="p-8 space-y-8 pb-32 flex flex-col items-center">
      <div className="w-full flex items-center gap-4">
        <button onClick={() => { playSound(); onBack(); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl"><ChevronLeft size={20}/></button>
        <h2 className="text-2xl font-black">{t.receipt}</h2>
      </div>

      <div className="w-full bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-2xl space-y-8 border-t-8 border-blue-600">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/40 rounded-full flex items-center justify-center mx-auto">
            <Check className="text-blue-600" size={32} />
          </div>
          <h3 className="text-xl font-black">To'lov qabul qilindi</h3>
          <p className="text-slate-400 text-xs">{t.orderId}: {order.id}</p>
        </div>

        <div className="space-y-4 border-y border-slate-100 dark:border-slate-700 py-6">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">{t.orderDate}:</span>
            <span className="font-bold">{order.date}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Mahsulot:</span>
            <span className="font-bold">{order.productName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Manzil:</span>
            <span className="font-bold text-right max-w-[150px]">{order.address}</span>
          </div>
          <div className="flex justify-between text-lg pt-2">
            <span className="font-black">Jami:</span>
            <span className="font-black text-blue-600">{order.price.toLocaleString()} UZS</span>
          </div>
        </div>

        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-white rounded-3xl shadow-lg">
            <QRCodeSVG value={`https://ruslan-shop.uz/order/${order.id}`} size={150} />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.scanQR}</p>
        </div>

        <button onClick={() => { playSound(); onBack(); }} className="w-full py-4 bg-slate-100 dark:bg-slate-700 rounded-2xl font-black text-sm uppercase">Yopish</button>
      </div>
    </div>
  );
};

const AdminOrderCard = ({ order, t, onUpdateStatus, onDelete }: any) => {
  const [trackNum, setTrackNum] = useState(order.trackNumber || '');
  
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm space-y-4 border-l-4 border-blue-600">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-black text-blue-600">{order.id}</h4>
          <p className="text-xs font-bold">{order.productName} ({order.size})</p>
          <p className="text-[10px] text-slate-400">{order.username} | {order.date}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
            order.status === 'paid' ? 'bg-emerald-100 text-emerald-600' :
            order.status === 'verifying' ? 'bg-amber-100 text-amber-600' :
            'bg-slate-100 text-slate-600'
          }`}>
            {t[order.status] || order.status}
          </div>
          <button onClick={() => onDelete(order.id)} className="p-2 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg active:scale-90 transition-all">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      
      <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-xs space-y-1">
        <p className="flex items-center gap-2"><MapPin size={12} className="text-slate-400"/> {order.address}</p>
        <p className="font-black text-blue-600">{order.price.toLocaleString()} UZS</p>
      </div>

      <div className="space-y-1">
        <label className="text-[9px] font-black text-slate-400 uppercase px-1">Trek Raqam</label>
        <input 
          className="w-full p-3 bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-600 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500" 
          placeholder="Trek raqam kiriting..." 
          value={trackNum} 
          onChange={e => setTrackNum(e.target.value)} 
        />
      </div>

      {order.receiptImage && (
        <a href={order.receiptImage} target="_blank" rel="noreferrer" className="block w-full py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-center rounded-xl text-[10px] font-black uppercase">Chekni ko'rish</a>
      )}

      <div className="flex gap-2">
        <button onClick={() => onUpdateStatus(order.id, 'paid', trackNum)} className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase">Tasdiqlash</button>
        <button onClick={() => onUpdateStatus(order.id, 'shipped', trackNum)} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase">Yo'lda</button>
        <button onClick={() => onUpdateStatus(order.id, 'delivered', trackNum)} className="flex-1 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase">Yetib keldi</button>
      </div>
    </div>
  );
};

const AdminOrdersView = ({ t, orders, onUpdateStatus, onDelete, onBack, playSound }: any) => {
  return (
    <div className="p-8 space-y-8 pb-32">
      <div className="flex items-center gap-4">
        <button onClick={() => { playSound(); onBack(); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl"><ChevronLeft size={20}/></button>
        <h2 className="text-2xl font-black">{t.adminOrders}</h2>
      </div>

      <div className="space-y-4">
        {orders.map((order: Order) => (
          <AdminOrderCard key={order.id} order={order} t={t} onUpdateStatus={onUpdateStatus} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
};

const ProfileView = ({ t, user, setUser, onLogout, onNavigate, playSound }: any) => {
  const [editing, setEditing] = useState(false);
  const [tempBio, setTempBio] = useState(user.bio || '');
  const [tempName, setTempName] = useState(user.username);

  const handleAvatar = (e: any) => {
    playSound();
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      setUser({ ...user, avatar: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    playSound();
    setUser({ ...user, username: tempName, bio: tempBio });
    setEditing(false);
  };

  return (
    <div className="p-8 space-y-8 pb-32">
      <div className="relative flex flex-col items-center">
        <div className="relative w-32 h-32 rounded-full border-4 border-blue-600/10 p-1 bg-white">
          <img src={user.avatar} className="w-full h-full rounded-full object-cover" />
          <label className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg cursor-pointer border-2 border-white">
            <Camera size={16} />
            <input type="file" className="hidden" onChange={handleAvatar} />
          </label>
        </div>
        <div className="mt-6 text-center">
          {editing ? (
            <div className="space-y-4">
              <input className="text-2xl font-black text-center bg-transparent border-b-2 border-blue-500 outline-none w-full" value={tempName} onChange={e=>setTempName(e.target.value)} />
              <textarea className="text-sm text-slate-500 text-center bg-slate-50 dark:bg-slate-800 rounded-xl p-3 w-full border-none outline-none resize-none" rows={3} value={tempBio} onChange={e=>setTempBio(e.target.value)} />
              <button onClick={saveProfile} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold mx-auto shadow-lg"><Save size={16}/> Saqlash</button>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-black tracking-tight uppercase">{user.username}</h2>
              <p className="text-slate-400 text-xs font-mono mb-3">ID: {user.telegramId}</p>
              <p className="text-sm text-slate-500 max-w-xs mx-auto mb-4">{user.bio || 'Hali bio qo\'shilmagan'}</p>
              <button onClick={() => { playSound(); setEditing(true); }} className="flex items-center gap-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl text-xs font-black uppercase mx-auto"><Edit3 size={14}/> {t.editProfile}</button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Bonuslar</p>
          <p className="text-2xl font-black text-blue-600">{user.referralBalance} UZS</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Do'stlar</p>
          <p className="text-2xl font-black">{user.invitedCount}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-4 shadow-sm space-y-2">
        <button onClick={() => { playSound(); onNavigate('orders'); }} className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors rounded-2xl">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600"><Package size={20}/></div>
          <span className="font-bold text-sm">Buyurtmalarim</span>
        </button>
        <button onClick={() => { playSound(); onNavigate('referral'); }} className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors rounded-2xl">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600"><UserPlus size={20}/></div>
          <span className="font-bold text-sm">Hamkorlik dasturi</span>
        </button>
        {user.isAdmin && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Admin Panel</p>
            <div className="space-y-2">
              <button onClick={() => { playSound(); onNavigate('admin_add_product'); }} className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors rounded-2xl">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-xl text-purple-600"><PlusCircle size={20}/></div>
                <span className="font-bold text-sm">Mahsulot qo'shish</span>
              </button>
              <button onClick={() => { playSound(); onNavigate('manage_orders'); }} className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors rounded-2xl">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl text-amber-600"><ClipboardList size={20}/></div>
                <span className="font-bold text-sm">{t.adminOrders}</span>
              </button>
              <button onClick={() => { playSound(); onNavigate('manage_banners'); }} className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors rounded-2xl">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600"><ImageIcon size={20}/></div>
                <span className="font-bold text-sm">Bannerni boshqarish</span>
              </button>
              <button onClick={() => { playSound(); onNavigate('manage_products'); }} className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors rounded-2xl">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600"><Grid size={20}/></div>
                <span className="font-bold text-sm">Mahsulotlarni boshqarish</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <button onClick={onLogout} className="w-full p-5 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-2xl flex items-center justify-center gap-2 font-black text-sm uppercase transition-colors"><LogOut size={20}/> Chiqish</button>
    </div>
  );
};

const AdminAddProductView = ({ onAdd, onBack, playSound, notify, productToEdit }: { onAdd: (p: Product) => void, onBack: () => void, playSound: () => void, notify: any, productToEdit?: Product | null }) => {
  const [form, setForm] = useState({
    name: productToEdit?.name || '',
    price: productToEdit?.pinduoduoPrice.toString() || '',
    oldPrice: productToEdit?.oldPrice?.toString() || '',
    category: productToEdit?.category || '',
    desc: productToEdit?.description || '',
    sizes: productToEdit?.sizes.join(', ') || 'S, M, L, XL',
    isOriginal: productToEdit?.isOriginal || false,
    isCheapPrice: productToEdit?.isCheapPrice || false
  });
  const [images, setImages] = useState<string[]>(productToEdit?.images || []);
  const [videos, setVideos] = useState<string[]>(productToEdit?.videos || []);
  const [isQuickAdd, setIsQuickAdd] = useState(false);

  const handleMedia = (e: any, type: 'img' | 'vid') => {
    playSound();
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const data = reader.result as string;
      if (type === 'img') setImages([...images, data]);
      else setVideos([...videos, data]);
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = (idx: number, type: 'img' | 'vid') => {
    playSound();
    if (type === 'img') setImages(images.filter((_, i) => i !== idx));
    else setVideos(videos.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    playSound();
    if (!form.name || !form.price || images.length === 0) {
      notify("Iltimos, nomi, narxi va kamida bitta rasm kiriting!", "error");
      return;
    }
    const newProduct: Product = {
      id: productToEdit?.id || Date.now().toString(),
      name: form.name,
      pinduoduoPrice: parseFloat(form.price),
      oldPrice: form.oldPrice ? parseFloat(form.oldPrice) : undefined,
      description: form.desc || `${form.name} - sifatli mahsulot.`,
      category: form.category || 'Boshqa',
      images,
      videos: videos.length > 0 ? videos : undefined,
      sizes: form.sizes.split(',').map(s => s.trim()).filter(s => s !== '') || ['Standard'],
      rating: productToEdit?.rating || 5,
      salesCount: productToEdit?.salesCount || 0,
      seller: productToEdit?.seller || {
        name: "Ruslan | Shop",
        avatar: "",
        rating: 5,
        description: "Rasmiy do'kon"
      },
      isOriginal: form.isOriginal,
      isCheapPrice: form.isCheapPrice
    };

    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      onAdd(newProduct);
    } catch (e) {
      notify("Mahsulot qo'shishda xatolik", "error");
    }
  };

  const setPreset = (type: string) => {
    playSound();
    if (type === 'clothes') setForm({...form, category: 'Kiyim', sizes: 'S, M, L, XL, XXL'});
    if (type === 'shoes') setForm({...form, category: 'Oyoq kiyim', sizes: '38, 39, 40, 41, 42, 43, 44'});
    if (type === 'electronics') setForm({...form, category: 'Elektronika', sizes: 'Standard'});
  };

  return (
    <div className="p-8 space-y-6 pb-32">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => { playSound(); onBack(); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl"><ChevronLeft size={20}/></button>
          <h2 className="text-2xl font-black">{productToEdit ? "Tahrirlash" : "Yangi Mahsulot"}</h2>
        </div>
        <button onClick={() => { playSound(); setIsQuickAdd(!isQuickAdd); }} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-colors ${isQuickAdd ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
          Quick Mode
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button onClick={() => setPreset('clothes')} className="flex-shrink-0 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-bold uppercase">Kiyim</button>
        <button onClick={() => setPreset('shoes')} className="flex-shrink-0 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-bold uppercase">Oyoq kiyim</button>
        <button onClick={() => setPreset('electronics')} className="flex-shrink-0 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-bold uppercase">Elektronika</button>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase px-2">Nomi</label>
          <input className="w-full p-4 bg-white dark:bg-slate-800 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="Mahsulot nomi" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase px-2">Narxi (UZS)</label>
            <input type="number" className="w-full p-4 bg-white dark:bg-slate-800 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" value={form.price} onChange={e=>setForm({...form, price: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase px-2">Eski Narx (UZS)</label>
            <input type="number" className="w-full p-4 bg-white dark:bg-slate-800 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ixtiyoriy" value={form.oldPrice} onChange={e=>setForm({...form, oldPrice: e.target.value})} />
          </div>
        </div>
        
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase px-2">Kategoriya</label>
          <input className="w-full p-4 bg-white dark:bg-slate-800 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" value={form.category} onChange={e=>setForm({...form, category: e.target.value})} />
        </div>

        {!isQuickAdd && (
          <>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase px-2">Variantlar (vergul bilan)</label>
              <input className="w-full p-4 bg-white dark:bg-slate-800 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" value={form.sizes} onChange={e=>setForm({...form, sizes: e.target.value})} />
            </div>
            <div className="flex gap-6 px-2 py-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${form.isOriginal ? 'bg-blue-600 border-blue-600' : 'border-slate-200 dark:border-slate-700'}`}>
                  {form.isOriginal && <Check size={14} className="text-white" />}
                </div>
                <input type="checkbox" className="hidden" checked={form.isOriginal} onChange={e => setForm({...form, isOriginal: e.target.checked})} />
                <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-tight">Original</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${form.isCheapPrice ? 'bg-pink-500 border-pink-500' : 'border-slate-200 dark:border-slate-700'}`}>
                  {form.isCheapPrice && <Check size={14} className="text-white" />}
                </div>
                <input type="checkbox" className="hidden" checked={form.isCheapPrice} onChange={e => setForm({...form, isCheapPrice: e.target.checked})} />
                <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-tight">Arzon narx</span>
              </label>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase px-2">Tavsif</label>
              <textarea rows={3} className="w-full p-4 bg-white dark:bg-slate-800 border rounded-2xl outline-none resize-none focus:ring-2 focus:ring-blue-500" value={form.desc} onChange={e=>setForm({...form, desc: e.target.value})} />
            </div>
          </>
        )}

        <div className="space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase px-2">Rasmlar</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            <label className="flex-shrink-0 w-24 h-24 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-300 cursor-pointer hover:bg-slate-50 transition-colors">
              <ImageIcon size={24}/>
              <input type="file" className="hidden" accept="image/*" onChange={e=>handleMedia(e, 'img')} />
            </label>
            {images.map((img, i) => (
              <div key={i} className="flex-shrink-0 w-24 h-24 rounded-2xl relative group">
                <img src={img} className="w-full h-full object-cover rounded-2xl" />
                <button onClick={()=>removeMedia(i, 'img')} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg"><X size={12}/></button>
              </div>
            ))}
          </div>
        </div>

        {!isQuickAdd && (
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase px-2">Videolar</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              <label className="flex-shrink-0 w-24 h-24 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-300 cursor-pointer hover:bg-slate-50 transition-colors">
                <Video size={24}/>
                <input type="file" className="hidden" accept="video/*" onChange={e=>handleMedia(e, 'vid')} />
              </label>
              {videos.map((vid, i) => (
                <div key={i} className="flex-shrink-0 w-24 h-24 rounded-2xl bg-slate-900 flex items-center justify-center relative">
                  <Play size={20} className="text-white"/>
                  <button onClick={()=>removeMedia(i, 'vid')} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg"><X size={12}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={handleSave} className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all mt-4 uppercase tracking-widest">
          {productToEdit ? "Saqlash" : "Mahsulotni qo'shish"}
        </button>
      </div>
    </div>
  );
};

const ManageProductsView = ({ products, onEdit, onDelete, onBack, playSound }: { products: Product[], onEdit: (p: Product) => void, onDelete: (id: string) => void, onBack: () => void, playSound: () => void }) => {
  const [q, setQ] = useState('');
  const filtered = products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="p-8 space-y-6 pb-32">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl"><ChevronLeft size={20}/></button>
        <h2 className="text-2xl font-black">Mahsulotlar</h2>
      </div>
      <div className="relative">
        <input className="w-full bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 p-4 pl-12 rounded-2xl outline-none" placeholder="Mahsulotni izlash..." value={q} onChange={e=>setQ(e.target.value)} />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
      </div>
      <div className="space-y-4">
        {filtered.map(p => (
          <div key={p.id} className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border dark:border-slate-700 flex gap-4 items-center">
            <img src={p.images[0]} className="w-16 h-16 rounded-2xl object-cover" />
            <div className="flex-1">
              <p className="font-bold text-sm line-clamp-1 uppercase">{p.name}</p>
              <p className="text-blue-600 font-black text-xs">{p.pinduoduoPrice.toLocaleString()} UZS</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { playSound(); onEdit(p); }} className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Edit3 size={16}/></button>
              <button onClick={() => { playSound(); onDelete(p.id); }} className="p-2 bg-red-50 text-red-500 rounded-xl"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ManageBannersView = ({ banners, onUpdate, onBack, playSound, notify }: any) => {
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', subtitle: '', image: '', link: '' });

  const handleSave = async () => {
    playSound();
    if (!form.title || !form.image) return notify("Sarlavha va rasm majburiy!", "error");
    
    let updatedBanners;
    if (editingBanner) {
      updatedBanners = banners.map(b => b.id === editingBanner.id ? { ...b, ...form } : b);
    } else {
      updatedBanners = [...banners, { id: Date.now().toString(), ...form }];
    }

    try {
      await fetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBanners)
      });
      onUpdate(updatedBanners);
      setEditingBanner(null);
      setShowModal(false);
      setForm({ title: '', subtitle: '', image: '', link: '' });
      notify("Banner saqlandi", "success");
    } catch (e) {
      notify("Xatolik yuz berdi", "error");
    }
  };

  const deleteBanner = async (id: string) => {
    if (!window.confirm("O'chirilsinmi?")) return;
    const updated = banners.filter(b => b.id !== id);
    try {
      await fetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      onUpdate(updated);
      notify("O'chirildi", "info");
    } catch (e) {
      notify("Xatolik", "error");
    }
  };

  const handleImage = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm({ ...form, image: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-8 space-y-6 pb-32">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl"><ChevronLeft size={20}/></button>
          <h2 className="text-2xl font-black">Bannerlar</h2>
        </div>
        <button onClick={() => { setEditingBanner(null); setForm({ title: '', subtitle: '', image: '', link: '' }); setShowModal(true); }} className="p-2 bg-blue-600 text-white rounded-xl"><Plus size={20}/></button>
      </div>

      <div className="space-y-4">
        {banners.map(b => (
          <div key={b.id} className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border dark:border-slate-700 flex gap-4 items-center">
            <img src={b.image} className="w-20 h-20 rounded-2xl object-cover" />
            <div className="flex-1">
              <p className="font-bold text-sm line-clamp-1">{b.title}</p>
              <p className="text-[10px] text-slate-400 line-clamp-1">{b.subtitle}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => { setEditingBanner(b); setForm({ title: b.title, subtitle: b.subtitle, image: b.image, link: b.link || '' }); setShowModal(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Edit3 size={16}/></button>
              <button onClick={() => deleteBanner(b.id)} className="p-2 bg-red-50 text-red-500 rounded-xl"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh] relative">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl"><X size={20}/></button>
            <h3 className="font-black text-xl mb-4">{editingBanner ? 'Tahrirlash' : 'Yangi Banner'}</h3>
            <div className="space-y-4">
              <input className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none" placeholder="Sarlavha" value={form.title} onChange={e=>setForm({...form, title: e.target.value})} />
              <input className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none" placeholder="Sub-sarlavha" value={form.subtitle} onChange={e=>setForm({...form, subtitle: e.target.value})} />
              <input className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none" placeholder="Link (Masalan: catalog)" value={form.link} onChange={e=>setForm({...form, link: e.target.value})} />
              <label className="block w-full p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center text-slate-400 cursor-pointer">
                {form.image ? <img src={form.image} className="h-20 mx-auto rounded-xl" /> : <><UploadCloud size={32} className="mx-auto mb-2"/> Rasm yuklash</>}
                <input type="file" className="hidden" accept="image/*" onChange={handleImage} />
              </label>
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={() => { setEditingBanner(null); setForm({ title: '', subtitle: '', image: '', link: '' }); }} className="flex-1 py-4 bg-slate-100 rounded-2xl font-bold uppercase text-xs">Bekor qilish</button>
              <button onClick={handleSave} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-500/20">Saqlash</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const OrdersView = ({ t, orders, onNavigate, setReceiptOrder }: any) => (
  <div className="p-8 space-y-6 pb-32">
    <h2 className="text-3xl font-black tracking-tight mb-8">Buyurtmalarim</h2>
    {orders.map((o: Order) => (
      <div key={o.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 animate-in slide-in-from-bottom-2">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] font-black text-slate-400 uppercase">ID: {o.id}</span>
          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${
            o.status === 'pending' ? 'bg-amber-50 text-amber-600' : 
            o.status === 'verifying' ? 'bg-blue-50 text-blue-600' :
            'bg-emerald-50 text-emerald-600'
          }`}>{t[o.status] || o.status}</span>
        </div>
        <div className="flex gap-4">
          {o.receiptImage && <img src={o.receiptImage} className="w-16 h-16 rounded-xl object-cover border border-slate-100" />}
          <div className="flex-1">
            <p className="font-bold text-sm mb-1 uppercase tracking-tight">{o.productName}</p>
            <p className="text-2xl font-black text-blue-600">{o.price.toLocaleString()} UZS</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setReceiptOrder(o); onNavigate('receipt'); }} className="flex-1 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1">
                <Receipt size={12}/> {t.viewReceipt}
              </button>
              {o.trackNumber && (
                <div className="flex-1 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Trek:</span>
                  <span className="text-[10px] font-mono font-bold text-blue-500">{o.trackNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    ))}
    {orders.length === 0 && <div className="text-center py-20 text-slate-300 italic font-medium">Hali buyurtmalar yo'q</div>}
  </div>
);

const UserSearchView = ({ users, onBack }: any) => {
  const [q, setQ] = useState('');
  const filtered = users.filter((u: User) => 
    u.username.toLowerCase().includes(q.toLowerCase()) || 
    u.telegramId.includes(q)
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 bg-slate-100 rounded-xl"><ChevronLeft size={20}/></button>
        <h2 className="text-2xl font-black">Foydalanuvchilar</h2>
      </div>
      <div className="relative">
        <input className="w-full bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 p-4 pl-12 rounded-2xl outline-none shadow-sm" placeholder="Izlash (ism yoki ID)..." value={q} onChange={e=>setQ(e.target.value)} />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
      </div>
      <div className="space-y-4">
        {filtered.map((u: User) => (
          <div key={u.telegramId} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
            <img src={u.avatar} className="w-12 h-12 rounded-full object-cover" />
            <div>
              <p className="font-bold text-sm uppercase">{u.username}</p>
              <p className="text-xs text-slate-400 font-mono">ID: {u.telegramId}</p>
            </div>
            {u.isAdmin && <div className="ml-auto text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg">ADMIN</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

const ProductCard = ({ product, onClick }: any) => (
  <div onClick={onClick} className="bg-white dark:bg-slate-800 rounded-[2rem] overflow-hidden flex flex-col group transition-all active:scale-95 shadow-sm hover:shadow-xl hover:-translate-y-1 duration-300 relative">
    <div className="h-44 bg-slate-50 dark:bg-slate-700 flex items-center justify-center p-4 relative">
      <img src={product.images[0]} className="max-h-full max-w-full object-contain transition-transform duration-700 group-hover:scale-110" />
      
      <div className="absolute bottom-2 left-2 flex flex-col gap-1 items-start">
        {product.isOriginal && (
          <div className="bg-white dark:bg-slate-900 px-2 py-1 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-1">
            <div className="w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center">
              <Check size={8} className="text-white" />
            </div>
            <span className="text-[8px] font-black text-slate-700 dark:text-slate-300 uppercase">Original</span>
          </div>
        )}
        {product.isCheapPrice && (
          <div className="bg-pink-500 px-2 py-1 rounded-lg shadow-sm">
            <span className="text-[8px] font-black text-white uppercase">Arzon narx kafolati</span>
          </div>
        )}
      </div>
    </div>
    <div className="p-5 flex-1 flex flex-col justify-between">
      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase line-clamp-1 mb-2 tracking-tight">{product.name}</h4>
      <div className="flex justify-between items-end">
        <div className="flex flex-col">
          {product.oldPrice && (
            <p className="text-[10px] text-slate-400 line-through font-bold">
              {(product.oldPrice * MARKUP_RATE * CURRENCY_RATE).toLocaleString()} UZS
            </p>
          )}
          <p className="text-xl font-black text-blue-600">{(product.pinduoduoPrice * MARKUP_RATE * CURRENCY_RATE).toLocaleString()} UZS</p>
        </div>
        <div className="bg-blue-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Plus size={16}/></div>
      </div>
    </div>
  </div>
);

const NavButton = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center space-y-1 transition-all flex-1 ${active ? 'text-blue-600' : 'text-slate-300'}`}>
    <div className={`p-2 rounded-2xl ${active ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>{icon}</div>
    <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

const CatalogView = ({ t, products, onProductClick }: any) => (
  <div className="p-8 pb-32">
    <h2 className="text-3xl font-black tracking-tight mb-8">Katalog</h2>
    <div className="grid grid-cols-2 gap-4">
      {products.map((p: any) => <ProductCard key={p.id} product={p} onClick={() => onProductClick(p)} />)}
    </div>
    {products.length === 0 && <div className="text-center py-20 text-slate-300 italic font-medium">Hali yuklar yo'q</div>}
  </div>
);

const SearchView = ({ query, setQuery, results, onProductClick }: any) => (
  <div className="p-8">
    <div className="relative mb-8">
      <input className="w-full bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 p-5 pl-14 rounded-[1.5rem] outline-none shadow-sm text-lg font-medium" placeholder="Tovar izlash..." value={query} onChange={e => setQuery(e.target.value)} />
      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
    </div>
    <div className="grid grid-cols-2 gap-4">
      {results.map((p: any) => <ProductCard key={p.id} product={p} onClick={() => onProductClick(p)} />)}
    </div>
    {results.length === 0 && query && <div className="text-center py-20 text-slate-400">Hech narsa topilmadi :(</div>}
  </div>
);

const ReferralView = ({ t, user, playSound, notify }: any) => {
  const [copied, setCopied] = useState(false);
  const refLink = MAIN_REF_LINK;

  const handleCopy = () => {
    playSound();
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    notify("Havola nusxalandi!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <div className="w-24 h-24 bg-blue-600 rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl mb-6">
          <UserPlus size={40} className="text-white" />
        </div>
        <h2 className="text-3xl font-black tracking-tight">Hamkorlik Dasturi</h2>
        <p className="text-slate-400 text-sm font-medium mt-2">Do'stlaringizni taklif qiling va har bir buyurtmadan bonusga ega bo'ling.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase">Jami bonuslar</p>
            <p className="text-3xl font-black text-blue-600">{user.referralBalance} UZS</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center"><BarChart3 size={24} className="text-blue-600" /></div>
        </div>

        <div className="space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase text-center">Hamkorlik havolangiz</p>
          <div className="relative">
            <input readOnly value={refLink} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 p-5 rounded-2xl text-xs font-mono pr-14 truncate" />
            <button onClick={handleCopy} className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-blue-600 text-white rounded-xl active:scale-90 transition-all shadow-lg">
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
