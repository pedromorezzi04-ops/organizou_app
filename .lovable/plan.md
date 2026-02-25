

# Substituir Link de Pagamento Cakto

Alteracao simples em 2 arquivos onde a URL antiga esta definida como constante.

## Alteracoes

| Arquivo | Linha | De | Para |
|---------|-------|----|------|
| `src/pages/Payment.tsx` | 7 | `https://pay.cakto.com.br/98ajdxe_784173` | `https://pay.cakto.com.br/dfgjcuf_784254` |
| `src/components/admin/PaymentsTab.tsx` | 23 | `https://pay.cakto.com.br/98ajdxe_784173` | `https://pay.cakto.com.br/dfgjcuf_784254` |

Nenhuma outra alteracao necessaria. A logica de `external_id` e o webhook continuam iguais.

