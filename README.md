# Medcn

Sistema de gerenciamento, agendamento e manutenção de pacientes, horários, consultas e seleção de especialidades médicas.

O **Medcn** é construído utilizando tecnologias modernas e robustas para garantir alta disponibilidade, performance, segurança e boa experiência de usuário.

## Stack Tecnológica

| Camada | Tecnologias |
| :--- | :--- |
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, Shadcn/UI, TanStack Query, Zustand, React Hook Form, Zod |
| **Backend** | NestJS 10, Fastify, TypeScript, Prisma ORM, JWT, Swagger/OpenAPI |
| **Banco de Dados** | PostgreSQL, Redis |
| **Testes** | Jest, React Testing Library, Supertest |
| **CI/CD** | GitHub Actions |

## Arquitetura

Monorepo gerenciado com **pnpm workspaces**:

```
odontoaura/
├── apps/
│   ├── backend/          # NestJS API server
│   └── frontend/         # Next.js web application
├── packages/
│   └── shared/           # Prisma schema & shared types
├── .github/              # CI/CD workflows & templates
└── docs/                 # Documentation
```

## Getting Started

### Pré-requisitos

- Node.js >= 20
- pnpm >= 9
- PostgreSQL
- Redis

### Instalação

```bash
# Clone o repositório
git clone https://github.com/havaianasdestruido/odontoaura.git
cd odontoaura

# Instale as dependências
pnpm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais de banco de dados

# Execute as migrações do Prisma
cd packages/shared
pnpm prisma migrate dev
cd ../..

# Inicie o backend
pnpm --filter @odontoaura/backend dev

# Inicie o frontend (em outro terminal)
pnpm --filter @odontoaura/frontend dev
```

### URLs de Desenvolvimento

| Serviço | URL |
| :--- | :--- |
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api |
| Swagger Docs | http://localhost:3001/api/docs |

## Endpoints da API

| Método | Rota | Descrição | Acesso |
| :--- | :--- | :--- | :--- |
| GET | `/api/health` | Health check | Público |
| POST | `/api/auth/register` | Cadastro de usuário | Público |
| POST | `/api/auth/login` | Login | Público |
| GET | `/api/auth/me` | Perfil do usuário logado | Autenticado |
| CRUD | `/api/users` | Gerenciamento de usuários | Admin |
| CRUD | `/api/doctors` | Perfis de médicos | Admin/Doctor |
| CRUD | `/api/specialties` | Especialidades médicas | Admin |
| CRUD | `/api/appointments` | Agendamentos | Variável por role |
| CRUD | `/api/medical-records` | Prontuários | Doctor/Admin |
| CRUD | `/api/health-plans` | Planos de saúde | Admin/Employee |

## Roles do Sistema

| Role | Descrição |
| :--- | :--- |
| `PATIENT` | Paciente - agenda consultas, vê histórico |
| `EMPLOYEE` | Recepção - gerencia fila, confirma presença |
| `DOCTOR` | Médico - agenda, prontuários, prescrições |
| `ADMIN` | Administrador - cadastros, config, auditoria |

## Testes

```bash
# Todos os testes
pnpm test

# Backend com coverage
pnpm --filter @odontoaura/backend run test -- --coverage

# Frontend
pnpm --filter @odontoaura/frontend run test
```

## CI/CD

O pipeline roda automaticamente no GitHub Actions:

1. **Lint** - Verificação de código
2. **Type Check** - Validação TypeScript
3. **Test** - Testes unitários backend e frontend
4. **Build** - Build de produção

## Licença

Proprietária - OdontoAura © 2026
