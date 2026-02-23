import { useState } from 'react';
import { Check, Clock, Trash2, CalendarDays, User, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Installment } from '@/hooks/useFinancialData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface InstallmentDetailDrawerProps {
  installment: Installment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const InstallmentDetailDrawer = ({ installment, open, onOpenChange }: InstallmentDetailDrawerProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (!installment) return null;

  const isPaid = installment.status === 'paid';

  const toggleStatus = async () => {
    const newStatus = isPaid ? 'pending' : 'paid';
    const { error } = await supabase
      .from('installments')
      .update({ status: newStatus })
      .eq('id', installment.id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      toast({ title: newStatus === 'paid' ? "Recebido! ✓" : "Marcado como pendente" });
      onOpenChange(false);
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase
      .from('installments')
      .delete()
      .eq('id', installment.id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível remover.", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      toast({ title: "Notinha removida" });
      setDeleteDialogOpen(false);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-lg font-bold text-foreground">
              {installment.customer_name}
            </DrawerTitle>
            <DrawerDescription>
              Detalhes da parcela {installment.current_installment} de {installment.total_installments}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 space-y-4">
            {/* Value highlight */}
            <div className={cn(
              "rounded-xl p-4 text-center",
              isPaid ? "bg-emerald-light" : "bg-amber-light"
            )}>
              <p className={cn(
                "text-2xl font-bold tabular-nums",
                isPaid ? "text-emerald" : "text-amber"
              )}>
                {formatCurrency(Number(installment.total_value))}
              </p>
              <p className={cn(
                "text-sm font-medium mt-1",
                isPaid ? "text-emerald" : "text-amber"
              )}>
                {isPaid ? '✓ Recebido' : '⏳ Pendente'}
              </p>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3">
              <DetailItem icon={User} label="Cliente" value={installment.customer_name} />
              <DetailItem icon={Hash} label="Parcela" value={`${installment.current_installment}/${installment.total_installments}`} />
              <DetailItem icon={CalendarDays} label="Vencimento" value={format(new Date(installment.due_date), "dd 'de' MMM, yyyy", { locale: ptBR })} />
            </div>
          </div>

          <DrawerFooter className="gap-2">
            <Button
              onClick={toggleStatus}
              className={cn(
                "w-full gap-2",
                isPaid
                  ? "bg-amber text-foreground hover:bg-amber/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {isPaid ? <Clock className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              {isPaid ? 'Marcar como Pendente' : 'Marcar como Recebido'}
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
              Remover Notinha
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover notinha?</AlertDialogTitle>
            <AlertDialogDescription>
              A parcela {installment.current_installment}/{installment.total_installments} de{' '}
              <strong>{installment.customer_name}</strong> ({formatCurrency(Number(installment.total_value))})
              será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
  <div className="bg-muted/50 rounded-lg p-3">
    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
      <Icon className="w-3.5 h-3.5" />
      <span className="text-xs font-medium">{label}</span>
    </div>
    <p className="text-sm font-semibold text-foreground truncate">{value}</p>
  </div>
);

export default InstallmentDetailDrawer;
