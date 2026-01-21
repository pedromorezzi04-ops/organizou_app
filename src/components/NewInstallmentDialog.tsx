import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { addMonths, format } from 'date-fns';

interface NewInstallmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NewInstallmentDialog = ({ open, onOpenChange }: NewInstallmentDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [customerName, setCustomerName] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [totalInstallments, setTotalInstallments] = useState('');
  const [firstDueDate, setFirstDueDate] = useState('');

  const resetForm = () => {
    setCustomerName('');
    setTotalValue('');
    setTotalInstallments('');
    setFirstDueDate('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName || !totalValue || !totalInstallments || !firstDueDate) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    const installmentCount = parseInt(totalInstallments);
    if (installmentCount < 1 || installmentCount > 24) {
      toast({
        title: "Número inválido",
        description: "As parcelas devem ser entre 1 e 24.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const value = parseFloat(totalValue.replace(',', '.'));
    const installmentValue = value / installmentCount;
    const parentId = crypto.randomUUID();

    // Create all installments
    const installments = [];
    for (let i = 0; i < installmentCount; i++) {
      const dueDate = addMonths(new Date(firstDueDate), i);
      installments.push({
        user_id: user?.id,
        customer_name: customerName,
        total_value: installmentValue,
        current_installment: i + 1,
        total_installments: installmentCount,
        parent_note_id: parentId,
        due_date: format(dueDate, 'yyyy-MM-dd'),
        status: 'pending' as const,
      });
    }

    const { error } = await supabase.from('installments').insert(installments);

    setLoading(false);

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Notinha criada!",
        description: `${installmentCount} parcelas geradas automaticamente.`,
      });
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Notinha</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">Nome do cliente</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ex: João Silva"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalValue">Valor total (R$)</Label>
            <Input
              id="totalValue"
              type="text"
              inputMode="decimal"
              value={totalValue}
              onChange={(e) => setTotalValue(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalInstallments">Quantidade de parcelas</Label>
            <Input
              id="totalInstallments"
              type="number"
              min="1"
              max="24"
              value={totalInstallments}
              onChange={(e) => setTotalInstallments(e.target.value)}
              placeholder="Ex: 3"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="firstDueDate">Data da 1ª parcela</Label>
            <Input
              id="firstDueDate"
              type="date"
              value={firstDueDate}
              onChange={(e) => setFirstDueDate(e.target.value)}
            />
          </div>

          {totalValue && totalInstallments && parseInt(totalInstallments) > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">
                Valor de cada parcela:{' '}
                <span className="font-medium text-foreground">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(
                    parseFloat(totalValue.replace(',', '.')) / parseInt(totalInstallments)
                  )}
                </span>
              </p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Notinha'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewInstallmentDialog;
