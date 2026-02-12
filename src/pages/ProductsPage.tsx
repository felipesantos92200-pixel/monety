import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { TrendingUp, History, X, Timer, Pickaxe, Gem, Crown, Sparkles, Star, Award, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  price: number;
  daily_return: number;
  duration_days: number;
  total_return: number;
  image_url: string;
  tier: string;
  icon: string;
}

interface Investment {
  id: string;
  product_name: string;
  amount: number;
  daily_return: number;
  days_remaining: number;
  created_at: string;
  image_url: string;
}

const tierColors: Record<string, { bg: string; border: string; icon: string }> = {
  bronze: { bg: 'from-amber-900/20 to-amber-800/20', border: 'border-amber-700/30', icon: 'text-amber-500' },
  silver: { bg: 'from-gray-500/20 to-gray-600/20', border: 'border-gray-500/30', icon: 'text-gray-400' },
  gold: { bg: 'from-yellow-600/20 to-yellow-700/20', border: 'border-yellow-600/30', icon: 'text-yellow-500' },
  platinum: { bg: 'from-cyan-600/20 to-cyan-700/20', border: 'border-cyan-600/30', icon: 'text-cyan-400' },
  diamond: { bg: 'from-blue-600/20 to-blue-700/20', border: 'border-blue-600/30', icon: 'text-blue-400' },
  emerald: { bg: 'from-emerald-600/20 to-emerald-700/20', border: 'border-emerald-600/30', icon: 'text-emerald-400' },
  elite: { bg: 'from-[#22c55e]/20 to-[#16a34a]/20', border: 'border-[#22c55e]/30', icon: 'text-[#22c55e]' },
};

const getIcon = (iconName: string, className: string) => {
  const icons: Record<string, JSX.Element> = {
    pickaxe: <Pickaxe className={className} />,
    gem: <Gem className={className} />,
    crown: <Crown className={className} />,
    sparkles: <Sparkles className={className} />,
    star: <Star className={className} />,
    award: <Award className={className} />,
  };
  return icons[iconName] || <Pickaxe className={className} />;
};

export default function ProductsPage() {
  const { user, token, refreshUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchInvestments();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        // Mapear produtos com tiers e ícones
        const productsWithTiers = data.map((p: any, idx: number) => ({
          ...p,
          tier: ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'emerald', 'elite'][idx] || 'bronze',
          icon: ['pickaxe', 'pickaxe', 'gem', 'sparkles', 'gem', 'star', 'crown'][idx] || 'pickaxe'
        }));
        setProducts(productsWithTiers);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvestments = async () => {
    try {
      const response = await fetch('/api/investments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInvestments(data);
      }
    } catch (err) {
      console.error('Error fetching investments:', err);
    }
  };

  const handleInvestment = async (productId: string, productName: string, price: number) => {
    const userBalance = Number(user?.balance) || 0;
    
    if (userBalance < price) {
      toast.error('Saldo insuficiente', {
        description: 'Faça um depósito para continuar'
      });
      return;
    }

    try {
      const response = await fetch('/api/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId })
      });

      if (response.ok) {
        await refreshUser();
        await fetchInvestments();
        toast.success('🎉 Compra realizada!', {
          description: `Você adquiriu o ${productName} com sucesso`
        });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao investir');
      }
    } catch (err) {
      console.error('Error investing:', err);
      toast.error('Erro ao realizar investimento');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#22c55e] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-down">
        <div>
          <h1 className="text-2xl font-bold text-white">Produtos</h1>
          <p className="text-gray-400 text-sm">Invista e receba 20% de retorno diário</p>
        </div>
        <Button
          onClick={() => setShowHistory(true)}
          className="bg-[#111111] border border-[#1a1a1a] text-white hover:bg-[#1a1a1a]"
        >
          <History className="w-4 h-4 mr-2" />
          Histórico
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-[#111111]/80 backdrop-blur-sm border border-[#22c55e]/20 rounded-xl p-3 flex items-center gap-3">
        <TrendingUp className="w-5 h-5 text-[#22c55e] flex-shrink-0" />
        <p className="text-sm text-gray-300">
          Todos os mineradores rendem <span className="text-[#22c55e] font-bold">20% ao dia</span> sobre o valor investido
        </p>
      </div>

      {/* Saldo Card */}
      <div className="bg-[#111111]/80 backdrop-blur-sm border border-[#1a1a1a] rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">Seu saldo</p>
          <p className="text-xl font-bold text-white">R$ {(Number(user?.balance) || 0).toFixed(2)}</p>
        </div>
        <div className="w-10 h-10 bg-[#22c55e]/20 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-[#22c55e]" />
        </div>
      </div>

      {/* Products Grid */}
      <div className="space-y-3">
        {products.map((product, index) => {
          const colors = tierColors[product.tier] || tierColors.bronze;
          const userBalance = Number(user?.balance) || 0;
          const canBuy = userBalance >= Number(product.price);

          return (
            <div
              key={product.id}
              className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-xl overflow-hidden animate-fade-in`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${colors.bg} rounded-lg flex items-center justify-center`}>
                      {getIcon(product.icon, `w-5 h-5 ${colors.icon}`)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{product.name}</h3>
                      <p className="text-[#22c55e] font-bold">R$ {Number(product.price).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-[#0a0a0a]/50 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="w-3 h-3 text-[#22c55e]" />
                      <span className="text-gray-500 text-xs">Diário</span>
                    </div>
                    <p className="text-sm font-bold text-[#22c55e]">R$ {Number(product.daily_return).toFixed(2)}</p>
                  </div>
                  <div className="bg-[#0a0a0a]/50 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-500 text-xs">Duração</span>
                    </div>
                    <p className="text-sm font-bold text-white">{product.duration_days} dias</p>
                  </div>
                  <div className="bg-[#0a0a0a]/50 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="w-3 h-3 text-[#22c55e]" />
                      <span className="text-gray-500 text-xs">ROI</span>
                    </div>
                    <p className="text-sm font-bold text-[#22c55e]">
                      {((Number(product.daily_return) * product.duration_days / Number(product.price)) * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                {/* Total Return Box */}
                <div className="bg-[#0a0a0a]/50 rounded-lg p-2 mb-3 text-center">
                  <span className="text-gray-500 text-xs">Retorno total em {product.duration_days} dias</span>
                  <p className="text-lg font-bold text-[#22c55e]">
                    R$ {(Number(product.daily_return) * product.duration_days).toFixed(2)}
                  </p>
                </div>

                {/* Buy Button */}
                <button
                  onClick={() => handleInvestment(product.id, product.name, Number(product.price))}
                  disabled={!canBuy}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                    canBuy
                      ? 'bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white hover:from-[#16a34a] hover:to-[#22c55e] shadow-lg shadow-[#22c55e]/20'
                      : 'bg-[#1a1a1a] text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {canBuy ? 'COMPRAR AGORA' : 'SALDO INSUFICIENTE'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* History Modal */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="bg-[#111111] border-[#1a1a1a] text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Histórico de Compras</span>
              <button
                onClick={() => setShowHistory(false)}
                className="w-10 h-10 bg-[#0a0a0a] rounded-full flex items-center justify-center hover:bg-[#1a1a1a] transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </DialogTitle>
          </DialogHeader>

          {investments.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Nenhum investimento ativo</p>
              <p className="text-gray-500 text-sm">Compre um produto para começar a ganhar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {investments.map((inv) => {
                const totalDays = 60; // Duração padrão
                const daysElapsed = totalDays - inv.days_remaining;
                const progress = (daysElapsed / totalDays) * 100;

                return (
                  <div key={inv.id} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-white">{inv.product_name}</h3>
                      <span className="text-[#22c55e] font-bold">R$ {Number(inv.amount).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Timer className="w-4 h-4" />
                        <span>Tempo restante</span>
                      </div>
                      <div className="bg-[#22c55e]/20 px-3 py-1 rounded-full">
                        <span className="text-[#22c55e] font-bold text-sm">{inv.days_remaining} dias</span>
                      </div>
                    </div>
                    <div className="bg-[#1a1a1a] rounded-full h-2 overflow-hidden mb-2">
                      <div
                        className="bg-gradient-to-r from-[#22c55e] to-[#16a34a] h-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Rendimento diário: <span className="text-[#22c55e]">+R$ {Number(inv.daily_return).toFixed(2)}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
