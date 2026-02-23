import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface NewTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'income' | 'expense';
}

const paymentMethods = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'promissoria', label: 'Promissória' },
];

const categories = [
  { value: 'fornecedor', label: 'Fornecedor' },
  { value: 'insumo', label: 'Insumo' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'outros', label: 'Outros' },
];

const NewTransactionDialog = ({ open, onOpenChange, type }: NewTransactionDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<'paid' | 'pending'>('paid');

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setPaymentMethod('');
    setCategory('');
    setStatus('paid');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description || !amount) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha a descrição e o valor.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('transactions').insert({
      user_id: user?.id,
      type,
      description,
      amount: parseFloat(amount.replace(',', '.')),
      payment_method: paymentMethod || null,
      category: category || null,
      status,
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
        title: type === 'income' ? "Entrada registrada!" : "Saída registrada!",
      });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      resetForm();
      onOpenChange(false);
    }
  };

  const isIncome = type === 'income';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md glass-strong rounded-2xl shadow-lift">
        <DialogHeader>
          <DialogTitle>
            {isIncome ? 'Nova Entrada' : 'Nova Saída'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isIncome ? "Ex: Venda de produto" : "Ex: Compra de material"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
            />
          </div>

          {isIncome && (
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isIncome && (
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isIncome && (
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={status === 'paid' ? 'default' : 'outline'}
                  onClick={() => setStatus('paid')}
                  className="flex-1"
                >
                  Já recebi
                </Button>
                <Button
                  type="button"
                  variant={status === 'pending' ? 'default' : 'outline'}
                  onClick={() => setStatus('pending')}
                  className="flex-1"
                >
                  Vou receber
                </Button>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewTransactionDialog;
