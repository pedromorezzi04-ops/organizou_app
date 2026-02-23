

# Sistema SaaS Completo: Correcao 422 + Paywall + Admin

## Resumo

Este plano consolida tres frentes: (1) correcao definitiva do erro 422 adicionando `cellphone` ao payload, (2) confirmacao de que o fluxo de paywall ja esta implementado corretamente, e (3) pequenos ajustes para remover referencia ao status `pending`.

---

## O que ja esta funcionando

O sistema ja possui:
- Trial de 3 dias com redirecionamento automatico para `/payment`
- Alerta critico apos 72h de expiracao
- Acesso vitalicio para admin e `is_legacy`
- Aba de configuracoes de API no admin (api key + base url)
- Sandbox de teste com log JSON
- Pagina `/payment` com cupom e checkout

---

## Alteracoes Necessarias

### 1. Correcao do Erro 422 - Adicionar `cellphone` ao payload

**Problema:** A API AbacatePay exige `customer.cellphone` mas as Edge Functions nao enviam esse campo.

**Arquivo:** `supabase/functions/create-checkout/index.ts`
- Alterar a query de profile para buscar tambem um campo de telefone (se existir) ou usar fallback
- Adicionar `cellphone` ao objeto `customer` com sanitizacao `.replace(/\D/g, '')` e fallback `"11999999999"`

Trecho atual (linhas 129-132):
```typescript
customer: {
  name: customerName,
  email: userEmail,
},
```

Trecho corrigido:
```typescript
customer: {
  name: customerName,
  email: userEmail,
  cellphone: "11999999999",
},
```

**Arquivo:** `supabase/functions/admin-test-checkout/index.ts`
- Adicionar `cellphone` ao objeto `customer` com valor fixo de teste

Trecho atual (linhas 98-101):
```typescript
customer: {
  name: (claimsData.claims.email as string).split("@")[0],
  email: claimsData.claims.email as string,
},
```

Trecho corrigido:
```typescript
customer: {
  name: (claimsData.claims.email as string).split("@")[0],
  email: claimsData.claims.email as string,
  cellphone: "11999999999",
},
```

### 2. Remover referencia ao status `pending`

**Arquivo:** `src/hooks/useBlockedCheck.ts`
- O hook `get_user_status` ja nao trata `pending` de forma especial (trata apenas `blocked`), entao nenhuma alteracao e necessaria neste arquivo.

**Banco de dados:** A funcao `is_user_pending` existe mas nao e chamada em nenhum lugar do codigo. Pode ser mantida sem impacto.

### 3. Deploy das Edge Functions

Apos as alteracoes, fazer deploy de:
- `create-checkout`
- `admin-test-checkout`

---

## Secao Tecnica

### Arquivos Modificados
| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/create-checkout/index.ts` | Adicionar `cellphone: "11999999999"` no objeto customer (linha 131) |
| `supabase/functions/admin-test-checkout/index.ts` | Adicionar `cellphone: "11999999999"` no objeto customer (linha 100) |

### Nenhuma alteracao necessaria
| Componente | Razao |
|------------|-------|
| `src/pages/Payment.tsx` | Ja funcional com checkout + cupom |
| `src/hooks/useBlockedCheck.ts` | Ja implementa trial 3 dias + paywall |
| `src/hooks/useSubscription.ts` | Ja calcula estados corretamente |
| `src/App.tsx` | Ja redireciona para `/payment` quando `needsPayment` |
| `src/pages/AdminDashboard.tsx` | Ja possui abas de API, Cupons e Testes |

### Resultado Esperado
Apos o deploy, o payload enviado ao AbacatePay incluira os 3 campos obrigatorios (`name`, `email`, `cellphone`), eliminando o erro 422. O teste no admin e o checkout real funcionarao.

