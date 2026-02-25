

# Remover Trial e Marcar Usuários Existentes como "Antigo"

## Resumo

Duas mudancas principais:
1. **Novos usuarios** serao redirecionados para `/payment` imediatamente apos o cadastro (sem trial)
2. **Usuarios existentes** receberao o status `is_legacy = true` com acesso vitalicio, exibidos como "Antigo" na aba Assinaturas

## Alteracoes

### 1. Migracao no Banco de Dados
Marcar todos os perfis existentes como legacy:
```sql
UPDATE profiles SET is_legacy = true WHERE is_legacy = false;
```

### 2. Alterar default do `subscription_status` na tabela `profiles`
Novos perfis devem iniciar sem trial. Mudar o default de `'trial'` para `'pending'`:
```sql
ALTER TABLE profiles ALTER COLUMN subscription_status SET DEFAULT 'pending';
ALTER TABLE profiles ALTER COLUMN trial_started_at SET DEFAULT NULL;
```

### 3. `src/hooks/useBlockedCheck.ts`
- Remover toda logica de trial (bloco que verifica `trial_started_at` e calcula 3 dias)
- Se `subscription_status` nao for `active` e nao for legacy e nao for admin → `needsPayment = true`

### 4. `src/hooks/useSubscription.ts`
- Remover logica de trial e `trialDaysLeft`
- Estado `trial` deixa de existir; novos usuarios sem pagamento vao direto para `expired`
- Simplificar: sem assinatura ativa/legacy/admin = `needsPayment`

### 5. `src/pages/Payment.tsx`
- Remover referencia a trial na mensagem
- Ajustar texto para indicar que o pagamento e necessario para acessar o sistema

### 6. `src/components/admin/SubscriptionsTab.tsx`
- Renomear badge "Legacy" para "Antigo" (cor roxa mantida)
- Remover filtro/contagem de "Trial" (ou manter para retrocompatibilidade mas nao devera ter novos)
- Atualizar `getSubscriptionBadge` para exibir "Antigo" ao inves de "Legacy"

### 7. `src/contexts/AuthContext.tsx`
- No `createProfileIfNotExists`, o insert ja usara o novo default (`pending` ao inves de `trial`)
- Nenhuma mudanca de codigo necessaria aqui, o default vem do banco

## Fluxo Resultante

```text
Novo usuario → Cadastro → Profile criado (status=pending) → Redirecionado para /payment → Paga → Ativo
Usuario existente → is_legacy=true → Acesso vitalicio → Badge "Antigo" no admin
```

## Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| Migracao SQL | `UPDATE profiles SET is_legacy=true`, alterar defaults |
| `useBlockedCheck.ts` | Remover logica trial, pending = needsPayment |
| `useSubscription.ts` | Remover trial, simplificar estados |
| `Payment.tsx` | Ajustar textos (remover mencao a trial) |
| `SubscriptionsTab.tsx` | Badge "Legacy" → "Antigo" |

