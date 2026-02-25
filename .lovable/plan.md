

# Implementacao: Webhook Logs + Painel Admin de Pagamentos

## Situacao Atual

- `cakto-webhook` ja existe e funciona (recebe POST, atualiza profiles)
- `Payment.tsx` ja redireciona para Cakto com `external_id`
- `Dashboard.tsx` ja tem `PaymentChecker` com Realtime + polling
- `AdminDashboard.tsx` tem 2 abas: Usuarios e Cupons

Tudo no frontend e webhook ja esta funcional. Falta apenas a tabela de logs e o painel de diagnostico admin.

---

## Alteracoes

### 1. Migracao SQL: Criar tabela `webhook_logs`

```sql
CREATE TABLE public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'received',
  event_type text,
  user_id uuid
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view webhook_logs"
  ON public.webhook_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete webhook_logs"
  ON public.webhook_logs FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
```

Sem politica de INSERT para usuarios normais — apenas o Service Role (webhook) insere.

### 2. Atualizar Edge Function `cakto-webhook`

**Arquivo:** `supabase/functions/cakto-webhook/index.ts`

Adicionar log em `webhook_logs` para cada requisicao recebida (antes de processar):

```typescript
await serviceClient.from("webhook_logs").insert({
  payload: body,
  status: isPaid ? "paid" : "ignored",
  event_type: statusLower || "unknown",
  user_id: externalId || null,
});
```

Registrar tambem em caso de erro (status "error").

### 3. Nova aba Admin: "Pagamentos"

**Arquivo:** `src/pages/AdminDashboard.tsx`

Criar componente `PaymentsTab` com:

- **Tabela de Logs:** Lista os ultimos registros de `webhook_logs` com colunas: Data, Tipo, Status, User ID, e um botao para expandir/ver o payload JSON completo
- **Botao Atualizar:** Recarrega os logs manualmente
- **Simulador:** Botao "Simular Pagamento" que chama `supabase.functions.invoke('cakto-webhook')` com payload simulado contendo um `user_id` selecionado da lista de usuarios, para testar a ativacao
- **Link de Teste Real:** Botao que gera e abre `https://pay.cakto.com.br/98ajdxe_784173?external_id={admin_user_id}` para o admin testar o fluxo real

Atualizar TabsList para `grid-cols-3` (Usuarios, Cupons, Pagamentos).

### 4. Sem alteracoes em Payment.tsx e Dashboard.tsx

Ambos ja estao corretos e funcionais.

---

## Secao Tecnica

### Tabela criada
| Tabela | Descricao |
|--------|-----------|
| `webhook_logs` | Armazena todos os payloads recebidos pelo webhook, com RLS admin-only |

### Arquivos modificados
| Arquivo | Descricao |
|--------|-----------|
| `supabase/functions/cakto-webhook/index.ts` | Adicionar insert em `webhook_logs` para cada requisicao |
| `src/pages/AdminDashboard.tsx` | Nova aba "Pagamentos" com monitor de logs, simulador e link de teste |

### RLS
- `webhook_logs`: SELECT e DELETE apenas para admin. INSERT feito via Service Role no webhook (bypassa RLS).

### Permissoes
O webhook ja usa `SUPABASE_SERVICE_ROLE_KEY` (configurado nos secrets), o que permite inserir em `webhook_logs` e atualizar `profiles` sem restricoes de RLS.

