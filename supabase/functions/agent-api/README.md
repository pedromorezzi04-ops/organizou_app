# Agent API — Organizou+

Edge Function única (`agent-api`) que serve como API REST para o agente de IA (n8n).

## Endpoint

```
POST /functions/v1/agent-api
Authorization: Bearer <jwt_do_usuario>
Content-Type: application/json
x-idempotency-key: <uuid_opcional>
```

## Formato de Request

```json
{
  "action": "modulo.operacao",
  "params": {}
}
```

## Formato de Response

**Sucesso:**
```json
{
  "success": true,
  "data": {},
  "meta": { "action": "...", "timestamp": "...", "count": 0 }
}
```

**Erro:**
```json
{
  "success": false,
  "error": { "code": "ERROR_CODE", "message": "Mensagem" },
  "meta": { "action": "...", "timestamp": "..." }
}
```

## Códigos de Erro

| Código | HTTP | Descrição |
|--------|------|-----------|
| `AUTH_REQUIRED` | 401 | JWT ausente ou inválido |
| `FORBIDDEN` | 403 | Sem permissão |
| `SUBSCRIPTION_REQUIRED` | 402 | Assinatura inativa |
| `BLOCKED` | 403 | Usuário bloqueado |
| `VALIDATION_ERROR` | 400 | Campo inválido ou faltando |
| `NOT_FOUND` | 404 | Recurso não encontrado |
| `DUPLICATE` | 409 | Idempotência: operação já processada |
| `RATE_LIMITED` | 429 | 60 req/min excedido |
| `INTERNAL_ERROR` | 500 | Erro do servidor |
| `INVALID_ACTION` | 400 | Action não reconhecida |

---

## Actions Disponíveis

### transactions.list
Lista transações com filtros opcionais.
```json
{
  "action": "transactions.list",
  "params": {
    "type": "income | expense",
    "status": "paid | pending",
    "category": "string",
    "date_from": "YYYY-MM-DD",
    "date_to": "YYYY-MM-DD",
    "search": "string",
    "payment_method": "string",
    "order_by": "date | amount | created_at",
    "order_dir": "asc | desc",
    "limit": 50,
    "offset": 0
  }
}
```

### transactions.get
```json
{ "action": "transactions.get", "params": { "id": "uuid" } }
```

### transactions.create
```json
{
  "action": "transactions.create",
  "params": {
    "type": "income | expense",
    "description": "string",
    "amount": 100.00,
    "status": "paid | pending",
    "payment_method": "string",
    "category": "string",
    "date": "YYYY-MM-DD"
  }
}
```

### transactions.update
```json
{
  "action": "transactions.update",
  "params": { "id": "uuid", "description": "...", "amount": 0, "status": "...", "date": "..." }
}
```

### transactions.delete
```json
{ "action": "transactions.delete", "params": { "id": "uuid" } }
```

### transactions.update_status
```json
{
  "action": "transactions.update_status",
  "params": { "id": "uuid", "status": "paid | pending" }
}
```

---

### installments.list
```json
{
  "action": "installments.list",
  "params": {
    "client_name": "string",
    "status": "paid | pending",
    "parent_note_id": "uuid",
    "due_date_from": "YYYY-MM-DD",
    "due_date_to": "YYYY-MM-DD",
    "month": 1,
    "year": 2025,
    "order_by": "due_date | client_name | amount",
    "order_dir": "asc | desc",
    "limit": 50,
    "offset": 0
  }
}
```

### installments.get
```json
{ "action": "installments.get", "params": { "id": "uuid" } }
```

### installments.create
Cria N parcelas, calculando datas automaticamente (incremento de 1 mês).
```json
{
  "action": "installments.create",
  "params": {
    "client_name": "string",
    "description": "string",
    "total_amount": 1200.00,
    "num_installments": 12,
    "first_due_date": "YYYY-MM-DD",
    "status": "pending"
  }
}
```
**Retorna:** `{ installments: [...], parent_note_id: "uuid" }`

### installments.update
```json
{
  "action": "installments.update",
  "params": { "id": "uuid", "client_name": "...", "amount": 0, "due_date": "...", "status": "..." }
}
```

### installments.delete
```json
{ "action": "installments.delete", "params": { "id": "uuid" } }
```

### installments.delete_group
Deleta todas as parcelas de um grupo (`parent_note_id`).
```json
{ "action": "installments.delete_group", "params": { "parent_note_id": "uuid" } }
```

### installments.update_status
```json
{
  "action": "installments.update_status",
  "params": { "id": "uuid", "status": "paid | pending" }
}
```

---

### recurring.list
```json
{
  "action": "recurring.list",
  "params": {
    "is_active": true,
    "category": "string",
    "order_by": "description | amount | due_day",
    "order_dir": "asc | desc"
  }
}
```

### recurring.get
```json
{ "action": "recurring.get", "params": { "id": "uuid" } }
```

### recurring.create
```json
{
  "action": "recurring.create",
  "params": {
    "description": "string",
    "amount": 100.00,
    "due_day": 5,
    "category": "string",
    "is_active": true
  }
}
```

### recurring.update
```json
{
  "action": "recurring.update",
  "params": { "id": "uuid", "description": "...", "amount": 0, "due_day": 1, "is_active": true }
}
```

### recurring.delete
```json
{ "action": "recurring.delete", "params": { "id": "uuid" } }
```

### recurring.toggle
Inverte o valor de `is_active`.
```json
{ "action": "recurring.toggle", "params": { "id": "uuid" } }
```

---

### taxes.config_get
```json
{ "action": "taxes.config_get", "params": {} }
```
**Retorna:** `{ tax_regime, tax_rate, mei_fixed_value }`

### taxes.config_update
```json
{
  "action": "taxes.config_update",
  "params": {
    "tax_regime": "MEI | ME",
    "mei_fixed_value": 70.60,
    "tax_rate": 6.0
  }
}
```

### taxes.calculate
Calcula o imposto do mês. Se não houver registro, cria com status `pending`.
```json
{
  "action": "taxes.calculate",
  "params": { "month": 1, "year": 2025 }
}
```
**Retorna:** `{ month, year, regime, revenue (se ME), calculated_amount, payment_status, payment_id }`

### taxes.update_status
```json
{
  "action": "taxes.update_status",
  "params": { "id": "uuid", "status": "paid | pending" }
}
```

### taxes.list_payments
```json
{
  "action": "taxes.list_payments",
  "params": { "year": 2025, "status": "paid | pending" }
}
```

---

### dashboard.summary
```json
{
  "action": "dashboard.summary",
  "params": { "month": 1, "year": 2025 }
}
```
**Retorna:** `{ income_paid, expense_paid, pending_receivable, future_expected, balance, month, year }`

### dashboard.weekly_chart
```json
{
  "action": "dashboard.weekly_chart",
  "params": { "month": 1, "year": 2025 }
}
```
**Retorna:** `[{ week: 1, income: 0, expense: 0 }, ...]`

---

### charts.monthly_overview
```json
{
  "action": "charts.monthly_overview",
  "params": { "num_months": 6 }
}
```
**Retorna:** `[{ month, year, label: "Jan/25", income, expense, balance }, ...]`

### charts.by_category
```json
{
  "action": "charts.by_category",
  "params": { "type": "income | expense", "month": 1, "year": 2025 }
}
```
**Retorna:** `[{ category, total, percentage }, ...]`

### charts.evolution
```json
{
  "action": "charts.evolution",
  "params": { "type": "income | expense | balance", "num_months": 6 }
}
```
**Retorna:** `[{ month, year, label, value }, ...]`

---

### profile.get
```json
{ "action": "profile.get", "params": {} }
```
**Retorna:** `{ id, business_name, primary_color, logo_url, tax_regime, tax_rate, mei_fixed_value, created_at, updated_at }`

### profile.update
```json
{
  "action": "profile.update",
  "params": { "business_name": "string", "primary_color": "#7C3AED" }
}
```

---

### subscription.status
Disponível mesmo com assinatura inativa.
```json
{ "action": "subscription.status", "params": {} }
```
**Retorna:** `{ status, expires_at, days_remaining, is_legacy, state: "active | expired | expired_critical | pending" }`

---

## Deploy

```bash
supabase functions deploy agent-api
```

## Segurança

- Toda request requer `Authorization: Bearer <jwt>`
- Usuários bloqueados recebem `BLOCKED`
- Assinatura inativa recebe `SUBSCRIPTION_REQUIRED` (exceto `subscription.status` e `profile.get`)
- RLS do Supabase garante isolamento de dados por usuário
- Rate limit: 60 req/min por usuário (reset no cold start)
- Idempotência via header `x-idempotency-key`
