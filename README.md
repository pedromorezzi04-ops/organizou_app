# Organizou+

Sistema de organização financeira para micro e pequenos empreendedores brasileiros.

## Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + Shadcn/UI
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Realtime)
- **Deploy**: Vercel (frontend) + Supabase Cloud (backend)

## Desenvolvimento local

```bash
npm install
npm run dev
```

## Deploy

O deploy é feito automaticamente via Vercel ao fazer push na branch `main`.

As Edge Functions são deployadas via Supabase CLI:

```bash
supabase functions deploy
```
