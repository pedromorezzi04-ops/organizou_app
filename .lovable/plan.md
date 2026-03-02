

# Aumento Proporcional dos Cards na Pagina Graficos

## Mudancas em `src/pages/Graficos.tsx`

### 1. Summary Cards (4 cards do topo)
- Gap do grid: `gap-3` → `gap-3 lg:gap-4`
- CardContent padding: `p-3` → `p-3 lg:p-5`
- Icones: `w-4 h-4` → `w-4 h-4 lg:w-5 lg:h-5`
- Titulos: `text-xs` → `text-xs lg:text-sm`
- Valores: `text-lg` → `text-lg lg:text-2xl`
- Margem do valor: `mt-1` → `mt-1 lg:mt-2`

### 2. Chart Cards (todos os cards com graficos nas 3 tabs)
- CardHeader padding: `pb-2` → `pb-2 lg:pb-4`
- CardTitle: `text-sm` → `text-sm lg:text-base`
- Chart heights aumentados proporcionalmente:
  - `h-[250px]` → `h-[250px] lg:h-[320px]`
  - `h-[200px]` → `h-[200px] lg:h-[280px]`
- Empty states: `h-[200px]` → `h-[200px] lg:h-[280px]`

### 3. Espacamento geral
- `space-y-4` nas tabs → `space-y-4 lg:space-y-5`

Todas as mudancas usam prefixo `lg:` — mobile inalterado.

