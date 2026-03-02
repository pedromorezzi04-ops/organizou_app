

# Redesign Desktop-First: Expansao de Largura e Redistribuicao

## Situacao Atual

O layout inteiro esta limitado a `max-w-lg` (~32rem/512px) — header, main e BottomNav. Isso e otimo para mobile mas desperdiça ~70% da tela em desktop.

## Alteracoes

### 1. `src/components/Layout.tsx` — Expandir containers
- Header: `max-w-lg` → `max-w-lg lg:max-w-6xl`
- Main: `max-w-lg` → `max-w-lg lg:max-w-6xl`
- Padding lateral: `px-4` → `px-4 lg:px-8`

### 2. `src/components/BottomNav.tsx` — Expandir nav
- `max-w-lg` → `max-w-lg lg:max-w-6xl`

### 3. `src/pages/Dashboard.tsx` — Grid responsivo
- Summary cards: `grid-cols-2` → `grid-cols-2 lg:grid-cols-4` (4 cards em linha no desktop)
- Hero card + chart: colocar lado a lado no desktop usando `lg:grid lg:grid-cols-2 lg:gap-5` no container pai, mantendo empilhado no mobile
- Chart height: `h-[100px]` → `h-[100px] lg:h-[160px]`

### 4. `src/pages/Entradas.tsx` e `src/pages/Saidas.tsx` — Listas mais largas
- Nenhuma mudanca estrutural necessaria — o container pai ja vai expandir via Layout. As transaction cards ja usam `flex` e vao esticar naturalmente.

### 5. `src/pages/Notinhas.tsx` — Grid de cards
- No modo lista, usar `lg:grid lg:grid-cols-2 lg:gap-3` para distribuir cards em 2 colunas no desktop.

### 6. `src/pages/AdminDashboard.tsx` — Ja usa `max-w-6xl`, sem mudanca necessaria.

### 7. `src/components/admin/PaymentsTab.tsx` — Side-by-side
- Simulator card e Webhook Logs card: envolver em `lg:grid lg:grid-cols-2 lg:gap-4` para ficarem lado a lado no desktop.

### Exclusoes
- `src/pages/Config.tsx` — NAO sera alterado
- Backend/RLS — NAO sera alterado
- Mobile — continua identico (todas as mudancas usam breakpoint `lg:`)

### Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| `Layout.tsx` | max-w-lg → lg:max-w-6xl, padding |
| `BottomNav.tsx` | max-w-lg → lg:max-w-6xl |
| `Dashboard.tsx` | Grid 4 cols, hero+chart side-by-side |
| `Notinhas.tsx` | Grid 2 cols no desktop |
| `PaymentsTab.tsx` | Simulator + Logs side-by-side |

