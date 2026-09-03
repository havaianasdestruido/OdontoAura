# Stack do Frontend - OdontoAura

Documentação detalhada das tecnologias e ferramentas utilizadas na camada de Frontend da aplicação **OdontoAura**.

---

## 🛠️ Tecnologias Principais

| Tecnologia | Função / Descrição |
| :--- | :--- |
| **Next.js (React)** | Framework React com suporte a Server-Side Rendering (SSR), Static Site Generation (SSG) e App Router para alta performance e SEO. |
| **TypeScript** | Superset JavaScript que adiciona tipagem estática, garantindo maior segurança e facilidade de manutenção no código. |
| **Tailwind CSS** | Framework CSS utilitário para estilização ágil, responsiva e customizável. |
| **Shadcn/UI & Radix UI** | Biblioteca de componentes acessíveis e customizáveis baseados em Tailwind CSS. |

---

## 📦 Gerenciamento de Estado e Formulários

| Ferramenta | Utilização |
| :--- | :--- |
| **TanStack Query (React Query)** | Gerenciamento de estado assíncrono, cache de dados e sincronização com a API backend. |
| **Zustand** | Gerenciamento de estado global leve para armazenar dados da sessão do usuário e preferências da interface. |
| **React Hook Form** | Manipulação e controle de performance em formulários. |
| **Zod** | Validação de esquemas e tipos em conjunto com o React Hook Form. |

---

## 🌐 Comunicação e Utilitários

- **Axios / Fetch API**: Cliente HTTP para comunicação com os endpoints do Backend.
- **Lucide React**: Biblioteca de ícones modernos e leves.
- **Date-fns / Day.js**: Manipulação e formatação de datas e horários (crucial para o sistema de agendamento).

---

## 🧪 Testes e Qualidade de Código

- **Vitest / Jest**: Testes unitários de componentes e utilitários.
- **React Testing Library**: Testes de renderização e comportamento de componentes.
- **Playwright / Cypress**: Testes de ponta a ponta (E2E) simulando a jornada do paciente, médico, funcionário e administrador.
- **ESLint & Prettier**: Padronização e qualidade de código.
