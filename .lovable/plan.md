

# Fluxo Direto SaaS: Remocao de Aprovacao e Ativacao de Paywall

## Resumo

Transformar o sistema para que novos utilizadores entrem direto no Trial (3 dias) sem necessidade de aprovacao manual do admin. O admin mantem o poder de bloquear utilizadores.

## Alteracoes Necessarias

### 1. Migracao de Banco de Dados
- Alterar o valor padrao da coluna `status` na tabela `profiles` de `'pending'` para `'active'`
- Atualizar todos os perfis existentes com status `pending` para `active`

### 2. Remover Fluxo de Pendencia

**Ficheiros afetados:**
- `src/hooks/useBlockedCheck.ts` - Remover toda logica de `isPending`, simplificar para verificar apenas `blocked` e `needsPayment`
- `src/contexts/UserStatusContext.tsx` - Tipo atualizado automaticamente (vem do hook)
- `src/App.tsx` - Remover import de `Pending`, remover rota `/pending`, remover verificacao `isPending` do `ProtectedRoute` e `AppWithChat`
- `src/pages/Pending.tsx` - Eliminar ficheiro (nao sera mais usado)

### 3. Refatorar Logica de Paywall no useBlockedCheck

A logica atual so verifica subscricao se `status === 'active'`. Com a remocao do `pending`, a logica de paywall passa a ser:

```
1. Se blocked -> bloqueia
2. Se admin ou legacy -> acesso total
3. Se trial_started_at + 3 dias > agora -> trial ativo (acesso com restricoes)
4. Se subscription_status === 'active' e nao expirou -> acesso total
5. Caso contrario -> needsPayment = true -> redireciona para /payment
```

### 4. Admin Dashboard - Limpeza

- Remover contagem de "Pendentes" dos cards de estatisticas
- Manter botoes "Ativar" e "Bloquear" (ativar serve para desbloquear)

### 5. Ficheiros que NAO mudam

- `src/pages/Payment.tsx` - Ja esta funcional
- `src/pages/Config.tsx` - Ja tem export bloqueado no trial e botao encerrar conta
- `src/pages/Dashboard.tsx` - Ja tem PaymentChecker
- `supabase/functions/create-checkout/index.ts` - Ja funcional
- `supabase/functions/check-payment/index.ts` - Ja funcional

## Detalhes Tecnicos

### Migracao SQL
```sql
ALTER TABLE public.profiles 
  ALTER COLUMN status SET DEFAULT 'active';

UPDATE public.profiles 
  SET status = 'active' 
  WHERE status = 'pending';
```

### useBlockedCheck.ts - Nova logica simplificada
- Remover estado `isPending` e setter
- Na funcao `checkStatus`: se status === 'blocked', retornar blocked
- Verificar admin e legacy -> sem paywall
- Verificar trial (trial_started_at + 3 dias)
- Verificar assinatura ativa
- Caso contrario -> needsPayment

### App.tsx
- Remover `isPending` de `ProtectedRoute` e `AppWithChat`
- Remover rota `/pending`
- Remover import de `Pending`

### AdminDashboard.tsx
- Remover card "Pendentes" e filtro `pendingUsers`
- Badge de status: mostrar apenas "Ativo" ou "Bloqueado"

