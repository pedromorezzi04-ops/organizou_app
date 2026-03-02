

# Ajuste de Simetria do Dashboard e Reversao de Layout Admin/Config

## 1. Dashboard — Hero full-width alinhado com os 4 cards

O hero "Sobrou no mes" esta atualmente em `lg:grid-cols-2` lado a lado com o grafico. Para alinhar com os 4 cards abaixo, remover o grid 2-col e fazer o hero ocupar 100% da largura do container. O grafico semanal fica abaixo do hero (antes dos 4 cards), tambem full-width.

**Arquivo:** `src/pages/Dashboard.tsx`
- Linha 168: remover `lg:grid lg:grid-cols-2 lg:gap-5` do wrapper hero+chart — usar apenas `space-y-5`
- Manter todos os estilos proporcionais (lg:p-8, lg:text-4xl, lg:h-[200px])

## 2. Config — Conteudo compacto dentro do Layout expandido

Config usa `<Layout>` que tem `lg:max-w-6xl`. Em vez de alterar o Layout global, envolver o conteudo do Config em um wrapper `max-w-lg mx-auto` para manter o design estreito original.

**Arquivo:** `src/pages/Config.tsx`
- Linha 145: `<div className="space-y-6">` → `<div className="max-w-lg mx-auto space-y-6">`

## 3. Admin — Reverter para layout compacto

Reduzir o container do painel admin de `max-w-6xl` para `max-w-3xl` para centralizar e compactar.

**Arquivo:** `src/pages/AdminDashboard.tsx`
- Linha 205: `max-w-6xl` → `max-w-3xl`

**Arquivo:** `src/components/admin/PaymentsTab.tsx`
- Remover `lg:grid lg:grid-cols-2 lg:gap-4` do wrapper, voltar para `space-y-4` empilhado

## Salvaguardas
- Todas as outras paginas mantem o layout expandido
- Zero alteracao em backend/logica
- Mobile inalterado

