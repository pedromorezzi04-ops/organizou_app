import { useState, useEffect } from 'react';
import { Crown, Users, Clock, AlertTriangle, Gem, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SubscriptionProfile {
  id: string;
  user_id: string;
  business_name: string | null;
  status: string;
  created_at: string;
  email: string | null;
  subscription_status: string | null;
  subscription_expires_at: string | null;
  is_legacy: boolean | null;
  trial_started_at: string | null;
}

type FilterType = 'all' | 'active' | 'trial' | 'expired' | 'legacy';

const getSubscriptionBadge = (profile: SubscriptionProfile) => {
  if (profile.is_legacy) {
    return <Badge className="bg-purple-500 hover:bg-purple-600 text-white border-transparent">Legacy</Badge>;
  }

  const status = profile.subscription_status || 'trial';

  switch (status) {
    case 'active':
      if (profile.subscription_expires_at && new Date(profile.subscription_expires_at) < new Date()) {
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-transparent">Expirado</Badge>;
      }
      return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-transparent">Ativo</Badge>;
    case 'trial':
      return <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-transparent">Trial</Badge>;
    case 'expired':
      return <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-transparent">Expirado</Badge>;
    default:
      return <Badge className="bg-muted text-muted-foreground border-transparent">Inativo</Badge>;
  }
};

const getEffectiveStatus = (profile: SubscriptionProfile): string => {
  if (profile.is_legacy) return 'legacy';
  const status = profile.subscription_status || 'trial';
  if (status === 'active' && profile.subscription_expires_at && new Date(profile.subscription_expires_at) < new Date()) {
    return 'expired';
  }
  return status;
};

const SubscriptionsTab = () => {
  const [profiles, setProfiles] = useState<SubscriptionProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_all_profiles') as { data: SubscriptionProfile[] | null; error: any };
      if (error) { toast.error('Erro ao carregar assinaturas'); return; }
      setProfiles(data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchProfiles(); }, []);

  const activeCount = profiles.filter(p => getEffectiveStatus(p) === 'active').length;
  const trialCount = profiles.filter(p => getEffectiveStatus(p) === 'trial').length;
  const expiredCount = profiles.filter(p => getEffectiveStatus(p) === 'expired').length;
  const legacyCount = profiles.filter(p => getEffectiveStatus(p) === 'legacy').length;

  const filtered = filter === 'all' ? profiles : profiles.filter(p => getEffectiveStatus(p) === filter);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: `Todos (${profiles.length})` },
    { key: 'active', label: `Ativos (${activeCount})` },
    { key: 'trial', label: `Trial (${trialCount})` },
    { key: 'expired', label: `Expirados (${expiredCount})` },
    { key: 'legacy', label: `Legacy (${legacyCount})` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ativos</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><Crown className="w-5 h-5 text-emerald-500" /><span className="text-2xl font-bold text-emerald-500">{activeCount}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Trial</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><Clock className="w-5 h-5 text-blue-500" /><span className="text-2xl font-bold text-blue-500">{trialCount}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Expirados</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-500" /><span className="text-2xl font-bold text-orange-500">{expiredCount}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Legacy</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><Gem className="w-5 h-5 text-purple-500" /><span className="text-2xl font-bold text-purple-500">{legacyCount}</span></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle>Assinaturas</CardTitle><CardDescription>Visão geral das assinaturas</CardDescription></div>
            <Button variant="outline" size="sm" onClick={fetchProfiles} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Atualizar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {filters.map(f => (
              <Button key={f.key} variant={filter === f.key ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f.key)}>
                {f.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Email</TableHead><TableHead>Negócio</TableHead><TableHead>Assinatura</TableHead><TableHead>Expira em</TableHead><TableHead>Cadastro</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.email || 'Sem email'}</TableCell>
                    <TableCell className="text-muted-foreground">{p.business_name || 'Sem nome'}</TableCell>
                    <TableCell>{getSubscriptionBadge(p)}</TableCell>
                    <TableCell>
                      {p.subscription_expires_at
                        ? format(new Date(p.subscription_expires_at), "dd/MM/yyyy", { locale: ptBR })
                        : '—'}
                    </TableCell>
                    <TableCell>{format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum resultado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionsTab;
