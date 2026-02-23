

# Remover Confirmacao de E-mail no Cadastro

## Problema
O sistema exige confirmacao de e-mail antes de permitir login, causando erro "Email not confirmed". O usuario quer que o cadastro seja direto: cria conta e ja entra no sistema.

## Solucao

### 1. Desativar confirmacao de e-mail
Usar a ferramenta `configure-auth` para ativar o auto-confirm de e-mail no backend. Isso faz com que todo novo usuario ja seja considerado confirmado automaticamente.

### 2. Ajustar fluxo de signup (src/pages/Auth.tsx)
Apos cadastro bem-sucedido:
- Redirecionar imediatamente para `/` (o sistema de paywall cuidara de enviar para `/payment` se necessario)
- Remover a logica de "fique na tela de login e verifique seu e-mail"
- Manter tratamento de erros para senha fraca/vazada e e-mail duplicado

### Detalhes Tecnicos

**Arquivo: `src/pages/Auth.tsx`**

Substituir o bloco de sucesso do signup:
```typescript
// DE:
toast({ title: "Conta criada!", description: "Verifique seu e-mail..." });
setIsLogin(true);
setPassword('');

// PARA:
toast({ title: "Conta criada!", description: "Bem-vindo ao Organizou+!" });
navigate('/');
```

Remover o tratamento especifico de "Email not confirmed" no login, pois nao sera mais necessario.

## Resultado Esperado
1. Usuario cria conta -> entra automaticamente -> redirecionado pelo paywall para `/payment`
2. Sem etapa de confirmacao de e-mail
3. Fluxo limpo e direto

