

# Correcao: Adicionar customer.name nas Edge Functions

## Problema
A API AbacatePay exige o campo `customer.name` no payload de criacao de cobranca. As duas Edge Functions enviam apenas `customer.email`, causando erro 422.

## Correcao

### 1. `supabase/functions/create-checkout/index.ts`
- Buscar o `business_name` do perfil do utilizador na tabela `profiles` usando o `userId`
- Usar esse nome como fallback, ou o email se nao houver nome
- Alterar o objeto `customer` de `{ email }` para `{ name, email }`

Trecho a alterar (linha ~97):
```typescript
// ANTES
customer: {
  email: userEmail,
},

// DEPOIS
customer: {
  name: customerName || userEmail,
  email: userEmail,
},
```

Para obter o nome, adicionar antes da chamada a API:
```typescript
const { data: profile } = await serviceClient
  .from("profiles")
  .select("business_name")
  .eq("user_id", userId)
  .single();

const customerName = profile?.business_name || userEmail;
```

### 2. `supabase/functions/admin-test-checkout/index.ts`
- Mesmo problema: o objeto `customer` so tem `email`
- Usar o email do admin como nome (ja que e um teste)

Trecho a alterar (linha ~80):
```typescript
// ANTES
customer: {
  email: claimsData.claims.email as string,
},

// DEPOIS
customer: {
  name: (claimsData.claims.email as string).split("@")[0],
  email: claimsData.claims.email as string,
},
```

## Ficheiros Afetados
- `supabase/functions/create-checkout/index.ts` - adicionar busca de business_name + campo name
- `supabase/functions/admin-test-checkout/index.ts` - adicionar campo name

## Resultado Esperado
Apos a correcao, o payload enviado a API incluira `customer.name`, eliminando o erro 422. O teste no painel admin e o checkout real do utilizador funcionarao corretamente.
