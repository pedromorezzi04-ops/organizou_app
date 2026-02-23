import { useState, useMemo } from 'react';
import { Plus, List, CalendarDays, Search } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllInstallments, Installment } from '@/hooks/useFinancialData';
import NewInstallmentDialog from '@/components/NewInstallmentDialog';
import InstallmentCard from '@/components/notinhas/InstallmentCard';
import InstallmentCalendarView from '@/components/notinhas/InstallmentCalendarView';
import InstallmentDetailDrawer from '@/components/notinhas/InstallmentDetailDrawer';
import InstallmentEmptyState from '@/components/notinhas/InstallmentEmptyState';

const Notinhas = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: installments, isLoading } = useAllInstallments();

  const filteredInstallments = useMemo(() => {
    if (!installments) return [];
    if (!searchQuery.trim()) return installments;
    const q = searchQuery.toLowerCase().trim();
    return installments.filter(i => i.customer_name.toLowerCase().includes(q));
  }, [installments, searchQuery]);

  const handleInstallmentClick = (installment: Installment) => {
    setSelectedInstallment(installment);
    setDrawerOpen(true);
  };

  const handleDayClick = (dayInstallments: Installment[]) => {
    if (dayInstallments.length === 1) {
      handleInstallmentClick(dayInstallments[0]);
    }
    // For multiple, just open first (could be expanded to a day-detail view)
    if (dayInstallments.length > 1) {
      handleInstallmentClick(dayInstallments[0]);
    }
  };

  return (
    <Layout title="Notinhas">
      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative animate-fade-in">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card shadow-card border-border"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between animate-fade-in" style={{ animationDelay: '50ms', animationFillMode: 'backwards' }}>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Toggle
              pressed={viewMode === 'list'}
              onPressedChange={() => setViewMode('list')}
              size="sm"
              aria-label="Ver lista"
              className="data-[state=on]:bg-card data-[state=on]:shadow-sm rounded-md h-8 px-3"
            >
              <List className="w-4 h-4" />
            </Toggle>
            <Toggle
              pressed={viewMode === 'calendar'}
              onPressedChange={() => setViewMode('calendar')}
              size="sm"
              aria-label="Ver calendário"
              className="data-[state=on]:bg-card data-[state=on]:shadow-sm rounded-md h-8 px-3"
            >
              <CalendarDays className="w-4 h-4" />
            </Toggle>
          </div>
          <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-2 shadow-card">
            <Plus className="w-4 h-4" />
            Nova
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-[72px] rounded-xl" />
            ))}
          </div>
        ) : filteredInstallments.length === 0 ? (
          <InstallmentEmptyState isSearchResult={!!searchQuery.trim() && installments && installments.length > 0} />
        ) : viewMode === 'list' ? (
          <div className="space-y-2">
            {filteredInstallments.map((installment, index) => (
              <InstallmentCard
                key={installment.id}
                installment={installment}
                onClick={handleInstallmentClick}
                index={index}
              />
            ))}
          </div>
        ) : (
          <InstallmentCalendarView
            installments={filteredInstallments}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            onDayClick={handleDayClick}
          />
        )}
      </div>

      <NewInstallmentDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <InstallmentDetailDrawer
        installment={selectedInstallment}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </Layout>
  );
};

export default Notinhas;
