

# Migracao de AbacatePay para Cakto Checkout

## Resumo

Substituir toda a integracao com AbacatePay por um fluxo simples de redirecionamento para checkout externo Cakto, com webhook para ativacao automatica de assinatura.

---

## Alteracoes

### 1. Pagina `/payment` - Redirecionar para Cakto

**Arquivo:** `src/pages/Payment.tsx`

- Remover chamada a `supabase.functions.invoke('create-checkout')`
- O botao "Ativar Plano Mensal" abre `https://pay.cakto.com.br/98ajdxe_784173?external_id={user.id}` em nova aba ou redireciona
- Manter cupom? Nao — o fluxo Cakto e externo, remover campo de cupom
- Manter layout visual existente, apenas trocar a acao do botao

### 2. Nova Edge Function `cakto-webhook`

**Arquivo:** `supabase/functions/cakto-webhook/index.ts`

- `verify_jwt = false` no config.toml (webhook publico)
- Recebe POST da Cakto
- Extrai `external_id` (user ID) do payload
- Verifica status pago/aprovado no JSON
- Usa Service Role client para atualizar `profiles`:
  - `subscription_status = 'active'`
  - `subscription_expires_at = now + 1 mes`
  - `status = 'active'`
- Retorna 200 OK

### 3. Dashboard - Verificacao de status ao retornar

**Arquivo:** `src/pages/Dashboard.tsx`

- Substituir `PaymentChecker` (que usa `check-payment` + AbacatePay polling) por um listener Realtime no canal `profiles`
- Quando `searchParams` contem `status=checking`, mostrar overlay "Processando seu pagamento..."
- Ouvir `postgres_changes` na tabela `profiles` filtrado por `user_id`
- Quando `subscription_status` mudar para `active`, mostrar confirmacao e limpar overlay
- Fallback: timeout de 60s com mensagem "Se ja pagou, aguarde alguns minutos"

### 4. Limpeza - Remover funcoes AbacatePay

**Arquivos a deletar:**
- `supabase/functions/create-checkout/index.ts`
- `supabase/functions/admin-test-checkout/index.ts`
- `supabase/functions/check-payment/index.ts`
- `supabase/functions/payment-webhook/index.ts`

**Arquivo:** `supabase/config.toml`
- Remover entradas `[functions.create-checkout]`, `[functions.admin-test-checkout]`, `[functions.check-payment]`, `[functions.payment-webhook]`
- Adicionar `[functions.cakto-webhook]` com `verify_jwt = false`

### 5. Admin Dashboard - Remover abas AbacatePay

**Arquivo:** `src/pages/AdminDashboard.tsx`

- Remover `ApiSettingsTab` (configuracoes AbacatePay)
- Remover `TestingTab` (sandbox de teste AbacatePay)
- Manter `UsersTab` e `CouponsTab`
- Atualizar TabsList de 4 para 2 colunas (`grid-cols-2`)
- Remover imports nao utilizados (Settings, FlaskConical, Search, AlertCircle, CheckCircle2, etc)

### 6. Payment page - Retorno da Cakto

**Arquivo:** `src/pages/Payment.tsx`

- Ao clicar no botao, definir `localStorage.setItem('cakto_pending', 'true')` antes de redirecionar
- A URL de retorno da Cakto sera `https://easy-funds.lovable.app/?status=checking`

**Arquivo:** `src/pages/Dashboard.tsx`

- Verificar `searchParams.get('status') === 'checking'` ou `localStorage.getItem('cakto_pending')`
- Mostrar overlay de "Processando pagamento" com listener Realtime
- Quando ativado, limpar localStorage e searchParams

---

## Secao Tecnica

### Arquivos Criados
| Arquivo | Descricao |
|---------|-----------|
| `supabase/functions/cakto-webhook/index.ts` | Webhook para receber confirmacao de pagamento Cakto |

### Arquivos Modificados
| Arquivo | Descricao |
|---------|-----------|
| `src/pages/Payment.tsx` | Redirecionar para URL Cakto em vez de invocar Edge Function |
| `src/pages/Dashboard.tsx` | Substituir polling AbacatePay por Realtime listener |
| `src/pages/AdminDashboard.tsx` | Remover abas API e Testes |

### Arquivos Deletados
| Arquivo |
|---------|
| `supabase/functions/create-checkout/index.ts` |
| `supabase/functions/admin-test-checkout/index.ts` |
| `supabase/functions/check-payment/index.ts` |
| `supabase/functions/payment-webhook/index.ts` |

### Config
- `supabase/config.toml`: remover 4 funcoes antigas, adicionar `cakto-webhook`

### Formato esperado do webhook Cakto
O webhook da Cakto tipicamente envia um JSON com status de pagamento. A Edge Function ira verificar campos comuns como `status`, `payment_status`, ou `event` para detectar pagamento confirmado, e extrair `external_id` do payload para identificar o usuario.

