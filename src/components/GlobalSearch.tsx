import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, TrendingUp, TrendingDown, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Transaction, Installment } from '@/hooks/useFinancialData';
import { format } from 'date-fns';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GlobalSearch = ({ open, onOpenChange }: GlobalSearchProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || !user) {
      setTransactions([]);
      setInstallments([]);
      return;
    }

    setLoading(true);
    const term = `%${q.trim()}%`;

    const [txRes, instRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .or(`description.ilike.${term},category.ilike.${term}`)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('installments')
        .select('*')
        .ilike('customer_name', term)
        .order('due_date', { ascending: false })
        .limit(5),
    ]);

    setTransactions((txRes.data as Transaction[]) || []);
    setInstallments((instRes.data as Installment[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery, search]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      setTransactions([]);
      setInstallments([]);
    }
  }, [open]);

  // CMD+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  const hasResults = transactions.length > 0 || installments.length > 0;
  const hasQuery = query.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden border-border/60 shadow-lift">
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar transações, clientes, notinhas..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12 text-base"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && hasQuery && !hasResults && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum resultado para "<span className="font-medium text-foreground">{query}</span>"
            </div>
          )}

          {!loading && !hasQuery && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Digite para buscar por transações ou notinhas
            </div>
          )}

          {/* Transactions */}
          {transactions.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                Transações
              </p>
              {transactions.map((tx, i) => (
                <button
                  key={tx.id}
                  onClick={() => {
                    navigate(tx.type === 'income' ? '/entradas' : '/saidas');
                    onOpenChange(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left",
                    "hover:bg-accent transition-colors animate-fade-in"
                  )}
                  style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'backwards' }}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    tx.type === 'income'
                      ? "bg-emerald-light text-emerald"
                      : "bg-destructive/10 text-destructive"
                  )}>
                    {tx.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.category || tx.type === 'income' ? 'Entrada' : 'Saída'}
                      {tx.created_at && ` • ${format(new Date(tx.created_at), 'dd/MM/yy')}`}
                    </p>
                  </div>
                  <span className={cn(
                    "text-sm font-bold tabular-nums shrink-0",
                    tx.type === 'income' ? "text-emerald" : "text-destructive"
                  )}>
                    {formatCurrency(Number(tx.amount))}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Installments */}
          {installments.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                Notinhas / Parcelas
              </p>
              {installments.map((inst, i) => (
                <button
                  key={inst.id}
                  onClick={() => {
                    navigate('/notinhas');
                    onOpenChange(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left",
                    "hover:bg-accent transition-colors animate-fade-in"
                  )}
                  style={{ animationDelay: `${(transactions.length + i) * 30}ms`, animationFillMode: 'backwards' }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-amber-light text-amber">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{inst.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Parcela {inst.current_installment}/{inst.total_installments}
                      {` • ${format(new Date(inst.due_date), 'dd/MM/yy')}`}
                    </p>
                  </div>
                  <span className={cn(
                    "text-sm font-bold tabular-nums shrink-0",
                    inst.status === 'paid' ? "text-emerald" : "text-amber"
                  )}>
                    {formatCurrency(Number(inst.total_value))}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearch;
