

# Otimizacao Espacial e Redesign Proporcional — Desktop

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `SummaryCard.tsx` | Aumento proporcional: padding `lg:p-6`, icone `lg:w-12 lg:h-12`, fonte valor `lg:text-2xl`, titulo `lg:text-sm` |
| `Dashboard.tsx` | Hero+chart wrapper alinhado com cards abaixo (full-width, sem grid 2-col separado — usar layout unico que alinha hero+chart na mesma linha dos 4 cards). Hero card altura maior `lg:p-8`. Chart `lg:h-[200px]` |
| `Graficos.tsx` | Summary cards `lg:grid-cols-4`. Graficos de barra/area/pie: envolver em `lg:max-w-4xl lg:mx-auto` para afunilar e evitar distorcao. Graficos lado a lado onde faz sentido: overview charts em `lg:grid lg:grid-cols-2` |
| `Impostos.tsx` | Hero DAS card: `lg:max-w-2xl lg:mx-auto`. Config card: `lg:max-w-2xl lg:mx-auto`. Historico: `lg:max-w-3xl lg:mx-auto` |
| `Entradas.tsx` | Transaction cards em `lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0` no desktop. Cards com `lg:p-5` |
| `Saidas.tsx` | Mesma logica: cards em grid 2-col no desktop. Cards com `lg:p-5` |
| `Tabelas.tsx` | Rows com `lg:p-4` para mais altura. TotalCard com `lg:p-5` |
| `Notinhas.tsx` | Ja tem `lg:grid-cols-2`, manter |
| `Config.tsx` | NAO alterar (preservado) |

## Detalhes

### 1. SummaryCard — Escala Proporcional Desktop
- Padding: `p-4` → `p-4 lg:p-6`
- Icone container: `w-9 h-9` → `w-9 h-9 lg:w-12 lg:h-12`
- Icone inner (via props): mantido (os icones sao passados pelo Dashboard)
- Titulo: `text-xs` → `text-xs lg:text-sm`
- Valor: `text-lg` → `text-lg lg:text-2xl`

### 2. Dashboard — Alinhamento e Proporcao
- Hero card: `p-6` → `p-6 lg:p-8`, valor `text-3xl` → `text-3xl lg:text-4xl`
- Chart height: `lg:h-[160px]` → `lg:h-[200px]`
- Manter hero+chart em `lg:grid-cols-2` (ja esta correto e alinha com os 4 cards abaixo)

### 3. Graficos — Afunilamento
- Summary cards: `grid-cols-2` → `grid-cols-2 lg:grid-cols-4`
- Overview tab: charts em `lg:grid lg:grid-cols-2 lg:gap-4` para bar+area lado a lado, pie charts lado a lado
- Cada chart card limitado a proporcoes naturais pelo grid

### 4. Impostos — Afunilamento Central
- Hero DAS card: envolver em `lg:max-w-2xl lg:mx-auto`
- Config/onboarding card: `lg:max-w-2xl lg:mx-auto`
- Historico section: `lg:max-w-3xl lg:mx-auto`

### 5. Entradas e Saidas — Grid Desktop
- Lista de transaction cards: `space-y-3` → `space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0`
- Cards padding: adicionar `lg:p-5`

### 6. Tabelas — Rows Maiores
- Cada row: `p-3.5` → `p-3.5 lg:p-4`
- TotalCard: `p-4` → `p-4 lg:p-5`

### Salvaguardas
- Todas as classes usam prefixo `lg:` — zero impacto mobile
- Config.tsx intocado
- Nenhuma logica de backend alterada

