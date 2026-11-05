# OrganizaAry 📸🎬

Aplicação web mobile-first de alta performance para gestão de fluxo de trabalho fotográfico e audiovisual. Centraliza clientes (CRM), captações (eventos), pós-produção (Kanban) e integração com o ecossistema Google (Calendar, Drive e Meet).

---

## 🛠️ Tech Stack & Arquitetura

- **Front-end:** Next.js (App Router), React 19, TypeScript (Strict)
- **Styling & UI:** Tailwind CSS, Framer Motion, Lucide Icons, Radix UI patterns (Mobile-first, Dark mode)
- **Back-end & Database:** Supabase (PostgreSQL com RLS estrito e Supabase Auth)
- **Deploy:** Vercel (CI/CD via GitHub)
- **Integrações:** Google APIs (Calendar, Drive, Meet) via OAuth 2.0 (SSO)

---

## 🗄️ Estrutura do Banco de Dados (Supabase)

O script completo DDL com políticas de segurança RLS e triggers automáticos está disponível em:
👉 [`supabase/schema.sql`](./supabase/schema.sql)

### Tabelas Principais:
1. `profiles`: Perfis de usuário e armazenamento de tokens OAuth (refresh token offline).
2. `clients`: CRM de clientes com histórico de relacionamento e contatos.
3. `events`: Captações e eventos com máquina de estados (`budget_lead`, `scheduled`, `captured`, `post_production`, `finished`), precificação e links Google.
4. `tasks`: Kanban de pós-produção (`todo`, `in_progress`, `done`) com prioridades (`low`, `medium`, `high`, `urgent`) vinculadas aos eventos.

---

## 🚀 Como Executar Localmente

### 1. Clonar o repositório e instalar dependências
```bash
git clone https://github.com/erickgomx/OrganizaAry.git
cd OrganizaAry
npm install
```

### 2. Configurar variáveis de ambiente
Copie o arquivo `.env.example` para `.env.local`:
```bash
cp .env.example .env.local
```
Preencha com as credenciais do seu projeto Supabase e Google Cloud Console.

### 3. Aplicar o Schema no Supabase
1. Acesse o **SQL Editor** no painel do Supabase.
2. Copie o conteúdo de `supabase/schema.sql` e execute.

### 4. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```
Acesse `http://localhost:3000`.

---

## 📅 Roadmap de Execução

- [x] **Fase 1 - Scaffold & Schema:** Setup Next.js, Tailwind, client Supabase SSR, tipos estritos TypeScript e DDL SQL com RLS.
- [x] **Fase 2 - Auth & Google Config:** SSO Google com escopo offline (`access_type=offline`), captura & persistência de tokens (`google_refresh_token`), middleware de proteção de rotas, interface mobile-first de login e cliente Google APIs com auto-refresh.
- [x] **Fase 3 - Core CRM & Eventos:** Gestão completa de clientes (CRUD, atalhos rápidos WhatsApp/Telefone/Email, perfil Visão 360º com faturamento acumulado e histórico de captações) e pipeline de Eventos com máquina de 5 estados (`budget_lead` → `scheduled` → `captured` → `post_production` → `finished`).
- [ ] **Fase 4 - Task Engine & Kanban:** Drag-and-drop interativo com Framer Motion.
- [ ] **Fase 5 - Google APIs Integration:** Sincronização de calendário, geração de pastas no Drive e reuniões Meet.
