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

interface NewRecurringExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NewRecurringExpenseDialog = ({ open, onOpenChange }: NewRecurringExpenseDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('');

  const resetForm = () => {
    setName('');
    setAmount('');
    setDueDay('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !amount || !dueDay) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    const day = parseInt(dueDay);
    if (day < 1 || day > 31) {
      toast({
        title: "Dia inválido",
        description: "O dia deve ser entre 1 e 31.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('recurring_expenses').insert({
      user_id: user?.id,
      name,
      amount: parseFloat(amount.replace(',', '.')),
      due_day: day,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Despesa fixa cadastrada!",
      });
      queryClient.invalidateQueries({ queryKey: ['recurring_expenses'] });
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Despesa Fixa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Aluguel, Internet, Luz"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor mensal (R$)</Label>
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDay">Dia do vencimento</Label>
            <Input
              id="dueDay"
              type="number"
              min="1"
              max="31"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              placeholder="Ex: 10"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewRecurringExpenseDialog;
