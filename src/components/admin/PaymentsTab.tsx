import { useState, useEffect } from 'react';
import { RefreshCw, Loader2, Eye, ExternalLink, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WebhookLog {
  id: string;
  created_at: string;
  payload: Record<string, unknown>;
  status: string;
  event_type: string | null;
  user_id: string | null;
}

const CAKTO_CHECKOUT_URL = 'https://pay.cakto.com.br/dfgjcuf_784254';

const PaymentsTab = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [users, setUsers] = useState<{ user_id: string; email: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [simulating, setSimulating] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from('webhook_logs').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) { toast.error('Erro ao carregar logs'); }
    else { setLogs(data || []); }
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.rpc('admin_get_all_profiles');
    if (data) setUsers(data.map((u: any) => ({ user_id: u.user_id, email: u.email || u.user_id })));
  };

  useEffect(() => { fetchLogs(); fetchUsers(); }, []);

  const simulatePayment = async () => {
    if (!selectedUser) { toast.error('Selecione um usuário'); return; }
    setSimulating(true);
    try {
      const { error } = await supabase.functions.invoke('cakto-webhook', {
        body: {
          external_id: selectedUser,
          status: 'approved',
          simulated: true,
        },
      });
      if (error) toast.error('Erro na simulação');
      else { toast.success('Pagamento simulado com sucesso!'); fetchLogs(); }
    } catch { toast.error('Erro ao simular'); }
    setSimulating(false);
  };

  const openTestLink = () => {
    if (!user) return;
    window.open(`${CAKTO_CHECKOUT_URL}?external_id=${user.id}`, '_blank');
  };

  const statusColor = (s: string) => {
    if (s === 'paid') return 'bg-emerald-500 hover:bg-emerald-600';
    if (s === 'error') return 'bg-destructive';
    return '';
  };

  return (
    <div className="space-y-4">
      {/* Simulator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5" />Ferramentas de Teste</CardTitle>
          <CardDescription>Simule pagamentos ou teste o fluxo real</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.user_id} value={u.user_id}>{u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={simulatePayment} disabled={simulating || !selectedUser}>
              {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4 mr-1" />Simular Pagamento</>}
            </Button>
          </div>
          <Button variant="outline" onClick={openTestLink} className="w-full sm:w-auto">
            <ExternalLink className="w-4 h-4 mr-2" />Teste Real (Gerar Boleto)
          </Button>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle>Webhook Logs</CardTitle><CardDescription>Últimas requisições recebidas</CardDescription></div>
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum log recebido ainda</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead className="text-right">Payload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <>
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{format(new Date(log.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}</TableCell>
                      <TableCell><Badge variant="outline">{log.event_type || '—'}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={log.status === 'paid' ? 'default' : log.status === 'error' ? 'destructive' : 'secondary'}
                          className={statusColor(log.status)}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[120px] truncate">{log.user_id || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedLog === log.id && (
                      <TableRow key={`${log.id}-payload`}>
                        <TableCell colSpan={5}>
                          <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-48">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsTab;
