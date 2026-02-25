

# Painel de Assinaturas Ativas no Admin

## Problema

A RPC `admin_get_all_profiles` atual nao retorna `subscription_status` nem `subscription_expires_at`. Preciso de uma nova RPC ou atualizar a existente para incluir esses campos, e criar uma nova aba no painel admin.

## Alteracoes

### 1. Migracao SQL: Atualizar RPC `admin_get_all_profiles`

Recriar a funcao para incluir `subscription_status`, `subscription_expires_at`, `is_legacy` e `trial_started_at`:

```sql
CREATE OR REPLACE FUNCTION public.admin_get_all_profiles()
RETURNS TABLE(
  id uuid, user_id uuid, business_name text, status text, 
  created_at timestamptz, email text,
  subscription_status text, subscription_expires_at timestamptz,
  is_legacy boolean, trial_started_at timestamptz
)
...
```

### 2. Nova aba "Assinaturas" no Admin Dashboard

**Arquivo:** `src/components/admin/SubscriptionsTab.tsx` (novo)

Componente que:
- Chama `admin_get_all_profiles` (atualizada)
- Mostra cards resumo: Total Assinantes Ativos, Em Trial, Expirados, Legacy
- Tabela filtrada mostrando: Email, Negocio, Status da Assinatura (badge colorido), Data de Expiracao, Legacy
- Filtro por status (Todos / Active / Trial / Expired / Legacy)

**Arquivo:** `src/pages/AdminDashboard.tsx`

- Adicionar aba "Assinaturas" com icone `Crown` ou `BadgeCheck`
- Atualizar `grid-cols-3` para `grid-cols-4`

### 3. Visual dos Badges

| Status | Cor | Label |
|--------|-----|-------|
| active | Emerald | Ativo |
| trial | Blue | Trial |
| expired | Orange | Expirado |
| inactive | Gray | Inativo |
| is_legacy | Purple | Legacy |

### Arquivos

| Acao | Arquivo |
|------|---------|
| Criar | `src/components/admin/SubscriptionsTab.tsx` |
| Modificar | `src/pages/AdminDashboard.tsx` (nova aba) |
| Migracao | Atualizar RPC `admin_get_all_profiles` |

