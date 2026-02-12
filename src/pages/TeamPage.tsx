import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Users, Copy, Check, Share2, TrendingUp, Award } from 'lucide-react';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  email: string;
  created_at: string;
}

interface TeamData {
  level1: { count: number; totalEarned: number; members: TeamMember[] };
  level2: { count: number; totalEarned: number; members: TeamMember[] };
  level3: { count: number; totalEarned: number; members: TeamMember[] };
}

export default function TeamPage() {
  const { user, token } = useAuth();
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState<1 | 2 | 3>(1);
  const [copied, setCopied] = useState(false);

  const inviteLink = `${window.location.origin}/?code=${user?.invite_code}`;

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      const response = await fetch('/api/team', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTeamData(data);
      }
    } catch (err) {
      console.error('Error fetching team:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (user?.invite_code) {
      navigator.clipboard.writeText(user.invite_code);
      setCopied(true);
      toast.success('Código copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Junte-se ao Monety',
        text: `Use meu código de convite: ${user?.invite_code}`,
        url: inviteLink
      });
    } else {
      navigator.clipboard.writeText(inviteLink);
      toast.success('Link copiado!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-white">Carregando...</p>
      </div>
    );
  }

  const currentLevel = teamData?.[`level${activeLevel}` as keyof TeamData];
  const percentage = activeLevel === 1 ? 20 : activeLevel === 2 ? 5 : 1;
  const totalReferrals = (teamData?.level1.count || 0) + (teamData?.level2.count || 0) + (teamData?.level3.count || 0);
  const totalEarnings = (teamData?.level1.totalEarned || 0) + (teamData?.level2.totalEarned || 0) + (teamData?.level3.totalEarned || 0);

  return (
    <div className="space-y-6 pb-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Minha Equipe</h1>
        <p className="text-gray-400 text-sm">Convide amigos e ganhe comissões</p>
      </div>

      {/* Estatísticas Principais */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-[#111111]/80 backdrop-blur-sm border-[#1a1a1a]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-[#22c55e]/20 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-[#22c55e]" />
              </div>
              <span className="text-gray-400 text-sm">Convidados</span>
            </div>
            <p className="text-2xl font-bold text-white">{totalReferrals}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#111111]/80 backdrop-blur-sm border-[#1a1a1a]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-[#22c55e]/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#22c55e]" />
              </div>
              <span className="text-gray-400 text-sm">Comissões</span>
            </div>
            <p className="text-2xl font-bold text-[#22c55e]">R$ {totalEarnings.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Níveis de Comissão */}
      <Card className="bg-[#111111]/80 backdrop-blur-sm border-[#1a1a1a]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Award className="w-5 h-5 text-[#22c55e]" />
            Níveis de Comissão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between bg-[#0a0a0a] rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#22c55e]/20 rounded-full flex items-center justify-center">
                <span className="text-[#22c55e] font-bold">1</span>
              </div>
              <div>
                <p className="text-white font-semibold">Nível 1</p>
                <p className="text-gray-500 text-xs">Convites diretos</p>
              </div>
            </div>
            <span className="text-xl font-bold text-[#22c55e]">20%</span>
          </div>

          <div className="flex items-center justify-between bg-[#0a0a0a] rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-500/20 rounded-full flex items-center justify-center">
                <span className="text-gray-400 font-bold">2</span>
              </div>
              <div>
                <p className="text-white font-semibold">Nível 2</p>
                <p className="text-gray-500 text-xs">Convites dos seus convidados</p>
              </div>
            </div>
            <span className="text-xl font-bold text-gray-400">5%</span>
          </div>

          <div className="flex items-center justify-between bg-[#0a0a0a] rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-600/20 rounded-full flex items-center justify-center">
                <span className="text-gray-500 font-bold">3</span>
              </div>
              <div>
                <p className="text-white font-semibold">Nível 3</p>
                <p className="text-gray-500 text-xs">Terceiro nível</p>
              </div>
            </div>
            <span className="text-xl font-bold text-gray-500">1%</span>
          </div>
        </CardContent>
      </Card>

      {/* Link de Convite */}
      <Card className="bg-[#111111]/80 backdrop-blur-sm border-[#1a1a1a]">
        <CardHeader>
          <CardTitle className="text-white">Seu Link de Convite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-[#0a0a0a] rounded-xl p-3">
            <p className="text-sm text-gray-400 mb-1">Código:</p>
            <p className="text-[#22c55e] font-bold text-lg">{user?.invite_code}</p>
          </div>

          <div className="bg-[#0a0a0a] rounded-xl p-3">
            <p className="text-sm text-gray-400 mb-1">Link:</p>
            <p className="text-gray-300 text-sm break-all">{inviteLink}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleCopyCode}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
                copied
                  ? 'bg-[#22c55e] hover:bg-[#16a34a] text-white'
                  : 'bg-[#1a1a1a] hover:bg-[#252525] text-white border border-[#2a2a2a]'
              }`}
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>

            <Button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#16a34a] hover:to-[#22c55e] text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-[#22c55e]/20"
            >
              <Share2 className="w-5 h-5" />
              Compartilhar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Meus Convidados */}
      <Card className="bg-[#111111]/80 backdrop-blur-sm border-[#1a1a1a]">
        <CardHeader>
          <CardTitle className="text-white">Meus Convidados</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Abas de Níveis */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[1, 2, 3].map((level) => {
              const levelData = teamData?.[`level${level}` as keyof TeamData];
              return (
                <button
                  key={level}
                  onClick={() => setActiveLevel(level as 1 | 2 | 3)}
                  className={`py-3 rounded-xl font-semibold text-sm transition-all ${
                    activeLevel === level
                      ? 'bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white shadow-lg shadow-[#22c55e]/20'
                      : 'bg-[#0a0a0a] text-gray-400 hover:bg-[#1a1a1a] border border-[#1a1a1a]'
                  }`}
                >
                  Nível {level}
                  <span className="ml-1 text-xs opacity-70">
                    ({levelData?.count || 0})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Lista de Membros */}
          <div className="overflow-hidden" key={activeLevel}>
            {currentLevel && currentLevel.members.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto animate-slide-up">
                {currentLevel.members.map((member: TeamMember, index: number) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between bg-[#0a0a0a] rounded-xl p-3 border border-[#1a1a1a] hover:border-[#22c55e]/30 transition-all"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#22c55e]/20 rounded-full flex items-center justify-center">
                        <span className="text-[#22c55e] font-bold text-sm">
                          {member.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{member.email}</p>
                        <p className="text-gray-500 text-xs">
                          ID: {member.id.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="bg-[#22c55e]/10 px-3 py-1 rounded-full">
                        <span className="text-[#22c55e] font-semibold text-sm">{percentage}%</span>
                      </div>
                      <p className="text-gray-500 text-xs mt-1">
                        {new Date(member.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 animate-fade-in">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Nenhum convidado no nível {activeLevel}</p>
                {activeLevel === 1 && (
                  <p className="text-gray-500 text-sm mt-1">Compartilhe seu link e comece a ganhar!</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
