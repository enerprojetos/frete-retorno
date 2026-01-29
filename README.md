# Frete de Retorno — Demo (MVP)

Este projeto é um MVP (apresentação rápida) do conceito:

- **Empresa (SHIPPER)** cadastra um frete (origem/destino)
- **Motorista (DRIVER)** cria uma viagem (origem/destino + “corredor” em km)
- O sistema busca **fretes próximos da rota** (mesma ideia do “raio” no caminho)

## 1) Rodar o projeto (passo a passo)

1. Abra a pasta do projeto no VSCode.
2. No terminal, instale as dependências:

```bash
npm install
```

3. Configure o Supabase (veja seção 2 abaixo).
4. Rode o projeto:

```bash
npm run dev
```

5. Abra o link que aparecer no terminal (normalmente `http://localhost:5173`).

## 2) Configurar o Supabase (obrigatório)

O front precisa de 3 variáveis **VITE_**.

1. Copie o arquivo `.env.example` e renomeie para `.env`.
2. Abra `.env` e preencha com os dados do seu projeto no Supabase:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_FUNCTIONS_URL`

> Importante: depois de editar `.env`, pare o dev server (Ctrl+C) e rode `npm run dev` novamente.

### Onde encontro esses valores?

- Supabase Dashboard → **Project Settings** → **API**
  - Project URL → `VITE_SUPABASE_URL`
  - anon public key → `VITE_SUPABASE_ANON_KEY`
- Para Functions:
  - Geralmente é `https://<project-ref>.functions.supabase.co`
  - (se você estiver usando `supabase functions serve` local, a URL muda)

## 3) Como testar (fluxo de demo)

1. Entre em **Dados de demo (1 clique)** (no menu) e clique para criar alguns fretes.
2. Troque para **Motorista** (menu → Trocar perfil).
3. Crie uma viagem com corredor 25–50km.
4. Você será levado para a tela de **Matches**.

## 4) Se aparecer “Failed to create trip”

Isso quase sempre é:

- `VITE_SUPABASE_FUNCTIONS_URL` errado, ou
- as functions `trips-create` / `trips-matches` não estão publicadas.

O erro agora mostra o **endpoint** chamado. Copie a mensagem e me mande.
