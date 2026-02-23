import { FileText, SearchX } from 'lucide-react';

interface InstallmentEmptyStateProps {
  isSearchResult?: boolean;
}

const InstallmentEmptyState = ({ isSearchResult }: InstallmentEmptyStateProps) => (
  <div className="text-center py-16 animate-fade-in">
    <div className="w-16 h-16 mx-auto bg-accent rounded-2xl flex items-center justify-center mb-4">
      {isSearchResult ? (
        <SearchX className="w-8 h-8 text-accent-foreground" />
      ) : (
        <FileText className="w-8 h-8 text-accent-foreground" />
      )}
    </div>
    <p className="font-semibold text-foreground">
      {isSearchResult ? 'Nenhum resultado encontrado' : 'Nenhuma notinha cadastrada'}
    </p>
    <p className="text-sm text-muted-foreground mt-1 max-w-[240px] mx-auto">
      {isSearchResult
        ? 'Tente buscar por outro nome de cliente'
        : 'Crie notinhas para controlar suas parcelas e recebíveis'}
    </p>
  </div>
);

export default InstallmentEmptyState;
