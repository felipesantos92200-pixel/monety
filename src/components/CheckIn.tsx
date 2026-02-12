import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Gift, Check, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface CheckInProps {
  onCheckInComplete: () => void;
}

export default function CheckIn({ onCheckInComplete }: CheckInProps) {
  const { token, refreshUser } = useAuth();
  const [currentDay, setCurrentDay] = useState(0);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [loading, setLoading] = useState(false);

  const rewards = [
    { day: 1, amount: 1 },
    { day: 2, amount: 2 },
    { day: 3, amount: 3 },
    { day: 4, amount: 5 },
    { day: 5, amount: 8 },
    { day: 6, amount: 13 },
    { day: 7, amount: 20 }
  ];

  useEffect(() => {
    fetchCheckInStatus();
  }, []);

  const fetchCheckInStatus = async () => {
    try {
      const response = await fetch('/api/checkin/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentDay(data.currentDay);
        setCheckedInToday(data.checkedInToday);
      }
    } catch (err) {
      console.error('Error fetching check-in status:', err);
    }
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        await refreshUser();
        await fetchCheckInStatus();
        onCheckInComplete();
        
        toast.success('🎉 Parabéns!', {
          description: `Você ganhou R$ ${data.reward.toFixed(2)} no dia ${data.dayNumber}`,
          duration: 4000
        });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao fazer check-in');
      }
    } catch (err) {
      console.error('Error checking in:', err);
      toast.error('Erro ao fazer check-in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Grid de dias com design bonito mobile-first */}
      <div className="grid grid-cols-7 gap-2">
        {rewards.map((reward) => {
          const isCompleted = reward.day < currentDay || (reward.day === currentDay && checkedInToday);
          const isCurrent = reward.day === currentDay + 1 && !checkedInToday;
          const isLocked = reward.day > currentDay + 1;

          return (
            <div
              key={reward.day}
              className={`relative flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${
                isCompleted
                  ? 'bg-[#22c55e]/20 border-[#22c55e] shadow-lg shadow-[#22c55e]/10'
                  : isCurrent
                  ? 'bg-[#22c55e]/10 border-[#22c55e] animate-pulse'
                  : 'bg-[#0a0a0a] border-[#1a1a1a]'
              }`}
            >
              {isCompleted && (
                <div className="absolute -top-1 -right-1 bg-[#22c55e] rounded-full p-0.5 shadow-lg">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              {isLocked && (
                <Lock className="w-3 h-3 text-gray-500 mb-1" />
              )}
              <Gift className={`w-5 h-5 mb-1 transition-colors ${
                isCompleted ? 'text-[#22c55e]' : isCurrent ? 'text-[#22c55e]/70' : 'text-gray-500'
              }`} />
              <span className={`text-[10px] font-semibold ${
                isCompleted ? 'text-[#22c55e]' : isCurrent ? 'text-white' : 'text-gray-500'
              }`}>
                Dia {reward.day}
              </span>
              <span className={`text-[9px] ${
                isCompleted ? 'text-[#22c55e]' : isCurrent ? 'text-white' : 'text-gray-500'
              }`}>
                R$ {reward.amount}
              </span>
            </div>
          );
        })}
      </div>

      {/* Botão de check-in */}
      <Button
        onClick={handleCheckIn}
        disabled={checkedInToday || loading}
        className="w-full bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#22c55e]/20 transition-all py-6 text-base font-semibold"
      >
        {loading ? 'Fazendo check-in...' : checkedInToday ? '✓ Check-in feito hoje!' : 'Fazer Check-in'}
      </Button>
    </div>
  );
}
