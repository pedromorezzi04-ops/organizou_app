

# Correção do Fluxo de Cadastro e Confirmação de E-mail

## Problema Identificado

Ao criar uma conta, o sistema exige confirmação por e-mail (comportamento correto), mas:
1. Exibe a mensagem "Conta criada! Bem-vindo" como se tudo estivesse pronto
2. Redireciona para o Dashboard, que rejeita o usuário por falta de sessão
3. O usuário tenta logar e recebe "Email not confirmed" sem explicação clara

## Correções Planejadas

### 1. Fluxo de Signup (Auth.tsx)
Após cadastro bem-sucedido, **nao redirecionar** para `/`. Em vez disso:
- Exibir toast: "Conta criada! Verifique seu e-mail para confirmar o cadastro."
- Trocar a tela para o formulario de login automaticamente (`setIsLogin(true)`)
- Limpar os campos de senha

### 2. Tratamento do erro "Email not confirmed" no Login (Auth.tsx)
Adicionar tratamento especifico para quando o usuario tenta logar sem ter confirmado o e-mail:
- Detectar `error.message` contendo "Email not confirmed"
- Exibir toast amigavel: "E-mail nao confirmado. Verifique sua caixa de entrada (e o spam) para ativar sua conta."

## Detalhes Tecnicos

### Arquivo: `src/pages/Auth.tsx`

**Alteracao 1 - Signup success (linhas 135-141):**
Substituir:
```typescript
toast({
  title: "Conta criada!",
  description: "Bem-vindo ao seu controle financeiro.",
});
navigate('/');
```
Por:
```typescript
toast({
  title: "Conta criada!",
  description: "Verifique seu e-mail para confirmar o cadastro antes de fazer login.",
});
setIsLogin(true);
setPassword('');
```

**Alteracao 2 - Login error handling (linhas 88-103):**
Adicionar deteccao de "Email not confirmed" antes do bloco de "Invalid login credentials":
```typescript
if (error.message.includes('Email not confirmed')) {
  toast({
    title: "E-mail nao confirmado",
    description: "Verifique sua caixa de entrada (e o spam) para ativar sua conta.",
    variant: "destructive",
  });
} else if (error.message.includes('Invalid login credentials')) {
  // ... existing code
}
```

## Resultado Esperado

1. Usuario cria conta -> ve mensagem "Verifique seu e-mail" -> permanece na tela de login
2. Usuario tenta logar sem confirmar -> ve mensagem explicando que precisa confirmar
3. Usuario confirma e-mail -> faz login normalmente

