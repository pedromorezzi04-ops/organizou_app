import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, Users, UserCheck, UserX, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_all_profiles');

      if (error) {
        console.error('Error fetching users:', error);
        toast.error('Erro ao carregar usuários');
        return;
      }

      setUsers(data || []);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const updateUserStatus = async (userId: string, newStatus: 'active' | 'blocked') => {
    setUpdatingUser(userId);
    try {
      const { data, error } = await supabase.rpc('admin_update_user_status', {
        _user_id: userId,
        _status: newStatus
      });

      if (error) {
        console.error('Error updating user status:', error);
        toast.error('Erro ao atualizar status do usuário');
        return;
      }

      if (data) {
        toast.success(`Usuário ${newStatus === 'blocked' ? 'bloqueado' : 'ativado'} com sucesso`);
        fetchUsers();
      } else {
        toast.error('Não foi possível atualizar o status');
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao atualizar status');
    } finally {
      setUpdatingUser(null);
    }
  };

  // Loading state
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Not admin - don't render anything, just redirect
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const activeUsers = users.filter(u => u.status === 'active');
  const blockedUsers = users.filter(u => u.status === 'blocked');
  const pendingUsers = users.filter(u => u.status === 'pending');

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
            <p className="text-muted-foreground">Gerenciamento de usuários do sistema</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{users.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                <span className="text-2xl font-bold text-amber-500">{pendingUsers.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-500" />
                <span className="text-2xl font-bold text-emerald-500">{activeUsers.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bloqueados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-destructive" />
                <span className="text-2xl font-bold text-destructive">{blockedUsers.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Gerenciamento de Usuários</CardTitle>
                <CardDescription>
                  Controle o acesso dos usuários ao sistema
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchUsers}
                disabled={loadingUsers}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingUsers ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum usuário encontrado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Negócio</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">
                        {profile.email || 'Sem email'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {profile.business_name || 'Sem nome'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(profile.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={profile.status === 'active' ? 'default' : profile.status === 'pending' ? 'secondary' : 'destructive'}
                          className={
                            profile.status === 'active' 
                              ? 'bg-emerald-500 hover:bg-emerald-600' 
                              : profile.status === 'pending'
                              ? 'bg-amber-500 hover:bg-amber-600 text-white'
                              : ''
                          }
                        >
                          {profile.status === 'active' ? 'Ativo' : profile.status === 'pending' ? 'Pendente' : 'Bloqueado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {profile.status !== 'active' && (
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-emerald-500 hover:bg-emerald-600"
                              onClick={() => updateUserStatus(profile.user_id, 'active')}
                              disabled={updatingUser === profile.user_id}
                            >
                              {updatingUser === profile.user_id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <UserCheck className="w-4 h-4 mr-1" />
                                  Ativar
                                </>
                              )}
                            </Button>
                          )}
                          {profile.status !== 'blocked' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => updateUserStatus(profile.user_id, 'blocked')}
                              disabled={updatingUser === profile.user_id}
                            >
                              {updatingUser === profile.user_id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <UserX className="w-4 h-4 mr-1" />
                                  Bloquear
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Active Users Highlight */}
        {activeUsers.length > 0 && (
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-600">
                <UserCheck className="w-5 h-5" />
                Contas Ativas em Destaque
              </CardTitle>
              <CardDescription>
                Usuários com acesso ativo ao sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeUsers.map((profile) => (
                  <div 
                    key={profile.id}
                    className="flex items-center gap-3 p-3 bg-background rounded-lg border"
                  >
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {profile.business_name || 'Sem nome'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Desde {format(new Date(profile.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
