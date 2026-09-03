# Stack de Banco de Dados - OdontoAura

Documentação detalhada das tecnologias de armazenamento, persitência e gerenciamento de dados da aplicação **OdontoAura**.

---

## 🛠️ Banco de Dados Relacional (SGBD)

| Tecnologia | Função / Descrição |
| :--- | :--- |
| **PostgreSQL** | Sistema Gerenciador de Banco de Dados Relacional (SGBD) principal, escolhido por sua confiabilidade, consistência ACID e suporte avançado a dados estruturados e semi-estruturados (JSONB). |

---

## 🔄 ORM e Migrações

| Ferramenta | Função / Descrição |
| :--- | :--- |
| **Prisma ORM** | Object-Relational Mapping (ORM) moderno para Node.js/TypeScript. Proporciona consultas type-safe, gerenciamento de esquemas declarativos e migrações automatizadas. |
| **Prisma Migrations** | Controle de versão do esquema do banco de dados relacional. |

---

## ⚡ Caching e Sessões (In-Memory)

| Tecnologia | Função / Descrição |
| :--- | :--- |
| **Redis** | Armazenamento chave-valor em memória para gerenciamento de sessões, cache de dados frequentemente acessados (como horários disponíveis de médicos) e controle de taxa de requisições (rate limiting). |

---

## 📊 Modelagem Principal de Dados

O banco de dados relacional gerencia as seguintes entidades e relacionamentos principais:
- **Usuários & Perfis**: Autenticação unificada com papéis (`PATIENT`, `EMPLOYEE`, `DOCTOR`, `ADMIN`).
- **Médicos & Especialidades**: Vinculação entre profissionais de saúde e suas respectivas especialidades e locais de atendimento.
- **Consultas & Agendamentos**: Registro completo do ciclo de vida dos agendamentos (status: agendado, confirmado, finalizado, cancelado).
- **Prontuários Eletrônicos**: Histórico clínico, anamneses, diagnósticos e prescrições por consulta.
- **Planos de Saúde & Convênios**: Cadastro de operadoras, validação de carteirinhas e verificação de cobertura.
