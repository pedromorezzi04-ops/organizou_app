
# Correcao: Adicionar `taxId` ao payload AbacatePay

## Problema
A API AbacatePay retorna erro 422 porque o campo obrigatorio `customer.taxId` (CPF/CNPJ) nao esta sendo enviado no payload.

## Alteracoes

### 1. `supabase/functions/create-checkout/index.ts`
Adicionar `taxId: "00000000000"` ao objeto `customer` (linha 132, apos `cellphone`).

### 2. `supabase/functions/admin-test-checkout/index.ts`
Adicionar `taxId: "00000000000"` ao objeto `customer` (linha 101, apos `cellphone`).

### 3. Deploy
Re-deploy de ambas as Edge Functions: `create-checkout` e `admin-test-checkout`.

## Resultado
O payload completo do `customer` ficara:
```typescript
customer: {
  name: "...",
  email: "...",
  cellphone: "11999999999",
  taxId: "00000000000",
}
```
Isso eliminara o erro 422 relacionado ao campo `taxId`.
