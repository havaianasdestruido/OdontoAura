# Stack do Backend - OdontoAura

Documentação detalhada das tecnologias e ferramentas utilizadas na camada de Backend da aplicação **OdontoAura**.

---

## 🛠️ Tecnologias Principais

| Tecnologia | Função / Descrição |
| :--- | :--- |
| **Node.js** | Ambiente de execução JavaScript server-side. |
| **NestJS / Fastify / Express** | Framework Node.js estruturado em arquitetura modular, com suporte nativo a TypeScript, Injeção de Dependência e facilidade de manutenção. |
| **TypeScript** | Linguagem principal do backend, assegurando tipagem estática ponta a ponta. |

---

## 🔐 Autenticação, Autorização e Segurança

- **JWT (JSON Web Tokens)**: Autenticação stateless baseada em tokens.
- **Bcrypt / Argon2**: Hashing seguro de senhas dos usuários.
- **RBAC (Role-Based Access Control)**: Controle de acesso granular baseado nas 4 funções do sistema (Paciente, Funcionário, Médico e Administrador).
- **Helmet & CORS**: Camada de proteção de headers HTTP e controle de origem das requisições.

---

## 📄 Documentação e Comunicação

- **OpenAPI / Swagger**: Documentação interativa e automatizada de todas as rotas da API REST.
- **Zod / class-validator**: Validação e sanitização de dados de entrada nas requisições (DTOs).

---

## 🧪 Testes e Qualidade

- **Jest / Vitest**: Framework para execução de testes unitários e de integração.
- **Supertest**: Testes das rotas HTTP da API.
- **ESLint & Prettier**: Garantia das convenções de código e estilo.
