# Medcn

## 🛠️ Stack Tecnológica

O **Medcn** é construído utilizando tecnologias modernas e robustas para garantir alta disponibilidade, performance, segurança e boa experiência de usuário.

A documentação detalhada de cada camada da stack está disponível no diretório [`docs/stack/`](docs/stack/):

- 🎨 **[Frontend](docs/stack/frontend.md)**: Next.js (React), TypeScript, Tailwind CSS, Shadcn/UI, React Hook Form, Zod, TanStack Query.
- ⚙️ **[Backend](docs/stack/backend.md)**: Node.js, NestJS / Fastify, TypeScript, Prisma ORM, JWT, OpenAPI / Swagger.
- 🗄️ **[Banco de Dados](docs/stack/database.md)**: PostgreSQL, Redis, Prisma Migrations.

Para mais detalhes sobre as decisões e ferramentas de cada camada, acesse o **[Índice da Stack](docs/stack/README.md)**.

---

# Cenário

Nossa aplicação web consiste em um sistema de gerenciamento, agendamento, manutenção de pacientes, horários, consultas e seleção de especialidades médicas.

O sistema possui quatro áreas distintas, sendo elas:

1.  **Área do Paciente:** Espaço dedicado ao usuário para autocadastro, visualização de histórico médico, busca por especialidades/médicos e utilização de uma agenda virtual interativa para marcar, reagendar ou cancelar consultas de rotina.
    
2.  **Área do Funcionário (Recepção/Atendimento):** Ambiente operacional onde a equipe de recepção gerencia a fila de espera do dia, confirma presença de pacientes, realiza encaixes de última hora, atualiza cadastros e processa o faturamento ou validação de convênios/planos de saúde.
    
3.  **Área do Médico:** Ambiente clínico onde os profissionais visualizam sua agenda diária/semanal, acessam e preenchem prontuários eletrônicos, registram prescrições, solicitam exames e acompanham o histórico evolutivo dos pacientes atendidos.
    
4.  **Área do Administrador:** Painel de controle gerencial restrito para o cadastro de novos colaboradores (médicos e funcionários), configuração de horários de atendimento da clínica, gestão de convênios aceitos, definição de especialidades médicas e auditoria geral do sistema.

## Problemas a serem resolvidos

A gestão tradicional de agendamentos médicos baseada em ligações telefônicas e anotações em papel é ineficiente, gera alta taxa de absenteísmo (faltas), riscos de perda de histórico físico e desorganização no fluxo de atendimento. A aplicação substitui esses métodos ultrapassados por uma plataforma digital centralizada, ágil e acessível, garantindo previsibilidade para a clínica e autonomia controlada para o paciente.

## Escopo

Desenvolver um sistema web completo para gerenciar a rotina administrativa e clínica de uma clínica médica de atendimento cotidiano, otimizando a interação entre pacientes, recepcionistas, médicos e administradores.

## Requisitos
-   **Controle e fluxo de consultas/agendamentos:** Ciclo completo de vida da consulta (agendamento pelo paciente, confirmação pela recepção, atendimento pelo médico, finalização ou cancelamento).
    
-   **Controle de planos de saúde:** Cadastro e validação de operadoras de saúde aceitas, número de carteirinha e verificação de cobertura por procedimento/especialidade.
    
-   **Controle de locais de atendimento:** Gestão de salas ou unidades físicas da clínica vinculadas aos médicos e horários disponíveis.
    
-   **Controle de prontuários:** Histórico clínico digital estruturado, com registro de anamnese, diagnósticos, evoluções médicas e prescrições por atendimento.
    
-   **Seleção de especialidades:** Filtro e busca inteligente para que o paciente encontre a área da saúde necessária (ex: Clínica Geral, Pediatria, Cardiologia).
    
-   **Seleção de doutores:** Opção para o paciente escolher um médico específico da equipe, caso possua preferência ou acompanhamento prévio.
    
-   **Foco no atendimento cotidiano:** Direcionamento para consultas de clínica geral e especialidades de pronto atendimento/rotina, excluindo procedimentos de alta complexidade.

## O que o sistema não precisa fazer:
-   **Consultas online (Telemedicina):** A plataforma não contará com módulo de vídeo-atendimento ou chat síncrono para consultas remotas; todos os atendimentos são presenciais.
    
-   **Agendamentos cirúrgicos:** O escopo exclui a marcação de cirurgias, reservas de centro cirúrgico ou gestão de internações hospitalares.
    
-   **Acompanhamentos de longo prazo/terapêuticos:** Não haverá suporte para pacotes de sessões recorrentes e de longa data (como psicoterapia contínua ou acompanhamento nutricional de longo prazo), focando estritamente em consultas pontuais de rotina.
