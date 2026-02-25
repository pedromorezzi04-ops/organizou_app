

# Refatoracao de Seguranca e Inteligencia do Fluxo de Pagamento

## Resumo

Tres frentes de trabalho: (1) blindar o webhook contra chamadas nao autorizadas e reprocessamento duplicado, (2) exibir aviso de vencimento proximo no Dashboard, (3) manter a logica de bloqueio da ProtectedRoute intacta.

---

## 1. Edge Function `cakto-webhook` — Seguranca e Idempotencia

### 1a. Validacao de Token

Adicionar no inicio da funcao, apos o parse do body, uma verificacao do header `x-cakto-token`. O token esperado sera lido de `system_settings` (chave `cakto_webhook_token`) via `serviceClient`. Se o header nao existir ou nao corresponder, retornar 401 Unauthorized.

```text
Request → Verifica x-cakto-token → Token invalido? → 401
                                  → Token valido? → Continua
```

**Detalhe tecnico:** O admin devera cadastrar o token na tabela `system_settings` com `key_name = 'cakto_webhook_token'`. Na Cakto, configurar o mesmo token no campo de header customizado do webhook.

### 1b. Checagem de Duplicidade (Idempotencia)

Antes de atualizar o perfil, extrair um ID unico da transacao do payload (campos como `body.id`, `body.transaction_id`, `body.data?.id`). Consultar `webhook_logs` buscando por esse ID no campo `payload->>'transaction_id'` com `status = 'success'`. Se ja existir, retornar 200 com `{ already_processed: true }` sem processar novamente.

Apos o UPDATE bem-sucedido no perfil, gravar o log com `status = 'success'` incluindo o `transaction_id` no payload para referencia futura.

### 1c. Tratamento de Erros (ja existente, ajustar)

O try/catch atual ja grava erros. Ajustar para incluir o `transaction_id` quando disponivel e padronizar o status como `'error'`.

### Arquivo modificado
- `supabase/functions/cakto-webhook/index.ts`

### Necessidade: Secret para o token
- O admin precisa inserir o valor do token na tabela `system_settings` com key `cakto_webhook_token`. Isso pode ser feito pelo painel admin existente ou via uma migracao com valor placeholder.

---

## 2. Banner de Vencimento no Dashboard

### Logica

No componente `Dashboard`, usar o hook `useSubscription` que ja retorna o estado da assinatura. Adicionar uma consulta a `subscription_expires_at` do perfil do usuario. Se o estado for `active` e a expiracao for em menos de 5 dias, exibir um banner de aviso.

### Implementacao

Criar um componente `ExpirationBanner` dentro de `Dashboard.tsx`:
- Buscar `subscription_expires_at` via `get_subscription_info` RPC (ja disponivel)
- Calcular dias restantes: `Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))`
- Se <= 5 dias e > 0: exibir banner amarelo com icone de alerta
- Texto: "Sua assinatura vence em X dia(s). Renove agora para evitar o bloqueio de dados."
- Botao "Renovar" com `Link` para `/payment`
- Usuarios legacy/admin nao veem o banner

### Arquivo modificado
- `src/pages/Dashboard.tsx`

---

## 3. Garantia de Persistencia

A logica da `ProtectedRoute` em `App.tsx` e `useBlockedCheck.ts` permanece **inalterada**. O redirecionamento para `/payment` continua sendo acionado apenas quando `needsPayment = true` (assinatura expirada ou pendente). O banner do item 2 e apenas informativo e nao bloqueia acesso.

A Edge Function continua usando `SUPABASE_SERVICE_ROLE_KEY` (Service Role) para bypass de RLS ao atualizar o perfil.

---

## Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/cakto-webhook/index.ts` | Token validation, idempotencia, log com transaction_id |
| `src/pages/Dashboard.tsx` | Componente ExpirationBanner com aviso de 5 dias |

## Fluxo Resultante do Webhook

```text
POST /cakto-webhook
  → Verifica x-cakto-token (401 se invalido)
  → Parse body, extrai external_id e transaction_id
  → Log inicial na webhook_logs
  → Verifica duplicidade por transaction_id (200 se ja processado)
  → Verifica se status = paid
  → UPDATE profiles (subscription_status=active, expires_at=+1 mes)
  → Log final com status=success
  → 200 OK
```

