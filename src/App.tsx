import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProfilePage from './pages/ProfilePage';
import TeamPage from './pages/TeamPage';
import { Home, ShoppingBag, Users, User } from 'lucide-react';
import { Toaster } from 'sonner';

function AppContent() {
  const { user, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<'home' | 'products' | 'team' | 'profile'>('home');
  const [showAuth, setShowAuth] = useState<'login' | 'register'>('login');

  useEffect(() => {
    if (user) {
      setCurrentPage('home');
    }
  }, [user]);

  if (!user) {
    return (
      <>
        {showAuth === 'login' ? (
          <LoginPage onSwitchToRegister={() => setShowAuth('register')} />
        ) : (
          <RegisterPage onSwitchToLogin={() => setShowAuth('login')} />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      {/* Header */}
      <header className="bg-[#111111] border-b border-[#1a1a1a] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#22c55e] to-[#16a34a] rounded-xl flex items-center justify-center">
              <span className="text-2xl font-bold text-white">M</span>
            </div>
            <span className="text-2xl font-bold text-white">Monety</span>
          </div>

          <button
            onClick={logout}
            className="text-gray-300 hover:text-white px-4 py-2 rounded-lg hover:bg-red-500/20 transition-colors text-sm"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'products' && <ProductsPage />}
        {currentPage === 'team' && <TeamPage />}
        {currentPage === 'profile' && <ProfilePage />}
      </main>

      {/* Bottom Navigation - 4 Tabs */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#111111] border-t border-[#1a1a1a] z-50">
        <div className="max-w-7xl mx-auto px-2">
          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={() => setCurrentPage('home')}
              className={`flex flex-col items-center justify-center py-3 rounded-lg transition-all ${
                currentPage === 'home' 
                  ? 'bg-[#22c55e] text-white shadow-lg shadow-[#22c55e]/20' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Home className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Início</span>
            </button>

            <button
              onClick={() => setCurrentPage('products')}
              className={`flex flex-col items-center justify-center py-3 rounded-lg transition-all ${
                currentPage === 'products' 
                  ? 'bg-[#22c55e] text-white shadow-lg shadow-[#22c55e]/20' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Produtos</span>
            </button>

            <button
              onClick={() => setCurrentPage('team')}
              className={`flex flex-col items-center justify-center py-3 rounded-lg transition-all ${
                currentPage === 'team' 
                  ? 'bg-[#22c55e] text-white shadow-lg shadow-[#22c55e]/20' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Equipe</span>
            </button>

            <button
              onClick={() => setCurrentPage('profile')}
              className={`flex flex-col items-center justify-center py-3 rounded-lg transition-all ${
                currentPage === 'profile' 
                  ? 'bg-[#22c55e] text-white shadow-lg shadow-[#22c55e]/20' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <User className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Perfil</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}

export default App;
