import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, Users, UserCheck, UserX, RefreshCw, Settings, Tag, Plus, Trash2, Loader2, Send, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserProfile {
  id: string;
  user_id: string;
  business_name: string | null;
  status: string;
  created_at: string;
  email: string | null;
}

// ─── Users Tab ───
const UsersTab = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_all_profiles');
      if (error) { toast.error('Erro ao carregar usuários'); return; }
      setUsers(data || []);
    } finally { setLoadingUsers(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const updateUserStatus = async (userId: string, newStatus: 'active' | 'blocked') => {
    setUpdatingUser(userId);
    try {
      const { data, error } = await supabase.rpc('admin_update_user_status', {
        _user_id: userId, _status: newStatus,
      });
      if (error) { toast.error('Erro ao atualizar status'); return; }
      if (data) {
        toast.success(`Usuário ${newStatus === 'blocked' ? 'bloqueado' : 'ativado'}`);
        fetchUsers();
      }
    } finally { setUpdatingUser(null); }
  };

  const activeUsers = users.filter(u => u.status === 'active');
  const blockedUsers = users.filter(u => u.status === 'blocked');
  const pendingUsers = users.filter(u => u.status === 'pending');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /><span className="text-2xl font-bold">{users.length}</span></div></CardContent></Card>
        <Card className="border-amber-500/20"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pendentes</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><Users className="w-5 h-5 text-amber-500" /><span className="text-2xl font-bold text-amber-500">{pendingUsers.length}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ativos</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><UserCheck className="w-5 h-5 text-emerald-500" /><span className="text-2xl font-bold text-emerald-500">{activeUsers.length}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Bloqueados</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><UserX className="w-5 h-5 text-destructive" /><span className="text-2xl font-bold text-destructive">{blockedUsers.length}</span></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle>Usuários</CardTitle><CardDescription>Controle de acesso</CardDescription></div>
            <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loadingUsers}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingUsers ? 'animate-spin' : ''}`} />Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Email</TableHead><TableHead>Negócio</TableHead><TableHead>Data</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {users.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.email || 'Sem email'}</TableCell>
                    <TableCell className="text-muted-foreground">{p.business_name || 'Sem nome'}</TableCell>
                    <TableCell>{format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'active' ? 'default' : p.status === 'pending' ? 'secondary' : 'destructive'}
                        className={p.status === 'active' ? 'bg-emerald-500 hover:bg-emerald-600' : p.status === 'pending' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}>
                        {p.status === 'active' ? 'Ativo' : p.status === 'pending' ? 'Pendente' : 'Bloqueado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        {p.status !== 'active' && <Button variant="default" size="sm" className="bg-emerald-500 hover:bg-emerald-600" onClick={() => updateUserStatus(p.user_id, 'active')} disabled={updatingUser === p.user_id}>{updatingUser === p.user_id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><UserCheck className="w-4 h-4 mr-1" />Ativar</>}</Button>}
                        {p.status !== 'blocked' && <Button variant="destructive" size="sm" onClick={() => updateUserStatus(p.user_id, 'blocked')} disabled={updatingUser === p.user_id}>{updatingUser === p.user_id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><UserX className="w-4 h-4 mr-1" />Bloquear</>}</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── API Client ───
const ApiClient = () => {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [body, setBody] = useState('');
  const [responseData, setResponseData] = useState<string | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  const sendRequest = async () => {
    if (!url.trim()) { toast.error('Informe a URL'); return; }
    setSending(true);
    setResponseData(null);
    setResponseStatus(null);
    try {
      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (['POST', 'PUT', 'PATCH'].includes(method) && body.trim()) {
        options.body = body;
      }
      const res = await fetch(url, options);
      setResponseStatus(res.status);
      const text = await res.text();
      try {
        setResponseData(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setResponseData(text);
      }
    } catch (err: any) {
      setResponseData(`Erro: ${err.message}`);
      setResponseStatus(0);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="flex h-10 rounded-xl border border-input bg-card/60 px-3 py-2 text-sm font-mono font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option>GET</option>
          <option>POST</option>
          <option>PUT</option>
          <option>PATCH</option>
          <option>DELETE</option>
        </select>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/endpoint"
          className="font-mono text-xs flex-1"
        />
        <Button onClick={sendRequest} disabled={sending} size="sm" className="gap-1.5">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Enviar
        </Button>
      </div>

      {['POST', 'PUT', 'PATCH'].includes(method) && (
        <div className="space-y-1.5">
          <Label className="text-xs">Body (JSON)</Label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder='{"key": "value"}'
            className="flex min-h-[100px] w-full rounded-xl border border-input bg-card/60 backdrop-blur-sm px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all duration-200 resize-y"
          />
        </div>
      )}

      {responseData !== null && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Resposta</Label>
            <Badge variant={responseStatus && responseStatus >= 200 && responseStatus < 300 ? 'default' : 'destructive'}
              className={responseStatus && responseStatus >= 200 && responseStatus < 300 ? 'bg-emerald-500 text-xs' : 'text-xs'}>
              {responseStatus === 0 ? 'Erro' : responseStatus}
            </Badge>
          </div>
          <pre className="bg-muted/50 border rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all text-foreground/80 max-h-[300px] overflow-y-auto">
            {responseData}
          </pre>
        </div>
      )}
    </div>
  );
};

// ─── API Settings Tab ───
const ApiSettingsTab = () => {
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [keyRes, endRes] = await Promise.all([
        supabase.from('system_settings').select('key_value').eq('key_name', 'abacatepay_api_key').single(),
        supabase.from('system_settings').select('key_value').eq('key_name', 'abacatepay_endpoint').single(),
      ]);
      setApiKey(keyRes.data?.key_value || '');
      setEndpoint(endRes.data?.key_value || '');
      setLoading(false);
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all([
        supabase.from('system_settings').update({ key_value: apiKey }).eq('key_name', 'abacatepay_api_key'),
        supabase.from('system_settings').update({ key_value: endpoint }).eq('key_name', 'abacatepay_endpoint'),
      ]);
      toast.success('Configurações salvas!');
    } catch { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" />Configurações de API</CardTitle>
          <CardDescription>Configure a integração com o AbacatePay</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Chave da API AbacatePay</Label>
            <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="apt_..." type="password" />
          </div>
          <div className="space-y-2">
            <Label>Endpoint de Cobrança</Label>
            <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://api.abacatepay.com/v1/billing/create" />
          </div>
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Play className="w-4 h-4" />API Client</CardTitle>
          <CardDescription>Faça requisições HTTP direto do painel</CardDescription>
        </CardHeader>
        <CardContent>
          <ApiClient />
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Coupons Tab ───
const CouponsTab = () => {
  const [coupons, setCoupons] = useState<{ id: string; code: string; is_active: boolean; created_at: string }[]>([]);
  const [newCode, setNewCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchCoupons = async () => {
    setLoading(true);
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    setCoupons(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const createCoupon = async () => {
    if (!newCode.trim()) return;
    setCreating(true);
    const { error } = await supabase.from('coupons').insert({ code: newCode.trim().toUpperCase() });
    if (error) { toast.error(error.message.includes('duplicate') ? 'Cupom já existe' : 'Erro ao criar cupom'); }
    else { toast.success('Cupom criado!'); setNewCode(''); fetchCoupons(); }
    setCreating(false);
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from('coupons').delete().eq('id', id);
    toast.success('Cupom removido');
    fetchCoupons();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Tag className="w-5 h-5" />Cupons de Desconto</CardTitle>
        <CardDescription>Cupons que zeram o primeiro mês</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} placeholder="CÓDIGO" className="font-mono tracking-widest" />
          <Button onClick={createCoupon} disabled={creating || !newCode.trim()}>
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" />Criar</>}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : coupons.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum cupom criado</p>
        ) : (
          <div className="space-y-2">
            {coupons.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div>
                  <span className="font-mono font-semibold">{c.code}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteCoupon(c.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Main Admin Dashboard ───
const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
            <p className="text-muted-foreground">Gerenciamento do sistema</p>
          </div>
        </div>

        <Tabs defaultValue="users">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="gap-1.5"><Users className="w-4 h-4" />Usuários</TabsTrigger>
            <TabsTrigger value="api" className="gap-1.5"><Settings className="w-4 h-4" />API</TabsTrigger>
            <TabsTrigger value="coupons" className="gap-1.5"><Tag className="w-4 h-4" />Cupons</TabsTrigger>
          </TabsList>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="api"><ApiSettingsTab /></TabsContent>
          <TabsContent value="coupons"><CouponsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
