# NeriCare API — Sistema de Gestão de Escalas e Jornadas Hospitalares

[![Node.js Version](https://img.shields.io/badge/Node.js-24.x%20LTS-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![ORM](https://img.shields.io/badge/Prisma-6.x-teal.svg)](https://www.prisma.io/)
[![Documentation](https://img.shields.io/badge/OpenAPI-Swagger%203.0-brightgreen.svg)](https://swagger.io/)
[![Tests](https://img.shields.io/badge/Tests-8%20Passed-success.svg)](https://nodejs.org/api/test.html)

API RESTful corporativa desenvolvida para gestão de escalas médicas, plantões hospitalares e apuração automatizada de jornadas de trabalho em serviços de saúde.

---

## 1. PROBLEMA DE NEGÓCIO E OBJETIVO

No ambiente hospitalar e clínico, a gestão de escalas de profissionais de saúde (médicos, enfermeiros e técnicos) é um desafio de alta complexidade:
- **Jornadas Atípicas:** Plantões de 12h ou 24h que frequentemente cruzam a meia-noite.
- **Adicional Noturno:** Exigência de cômputo preciso de minutos trabalhados na faixa legal (22h às 05h).
- **Controle de Atrasos e Horas Extras:** Necessidade de comparar horários planejados versus efetivamente executados.
- **Rastreabilidade e Conformidade:** Identificação de registros profissionais em conselhos de classe (CRM, COREN) e controle de acesso estrito a dados sensíveis.

O objetivo da **NeriCare API** é oferecer uma camada de backend resiliente, fortemente tipada e auditável para automatizar o cadastro de escalas, a alocação de profissionais e a liquidação das jornadas de trabalho.

---

## 2. STACK TECNOLÓGICA

* **Runtime & Linguagem:** Node.js 24 LTS e TypeScript 5.
* **Framework Web:** Express.js 4.
* **Camada de Documentação e Rotas:** TSOA (TypeScript OpenAPI Annotation) gerando especificação OpenAPI 3 e Swagger UI.
* **Banco de Dados & ORM:** PostgreSQL 15 e Prisma ORM 6.
* **Autenticação & Segurança:** JWT (JSON Web Tokens), bcryptjs (hash criptográfico de senhas), Helmet e CORS.
* **Validação:** Zod para variáveis de ambiente e DTOs tipados.
* **Infraestrutura Local:** Docker e Docker Compose (PostgreSQL 15 Alpine + PgAdmin 4).
* **Suíte de Testes:** Node.js Native Test Runner (`node:test` e `node:assert/strict`) integrado a TypeScript.

---

## 3. ARQUITETURA DE SOFTWARE

O projeto adota o padrão **Feature-Driven Architecture** (Arquitetura Orientada a Funcionalidades/Domínios). Cada módulo agrupa sua própria responsabilidade de negócio:

```text
src/
├── features/                     # Domínios de negócio
│   ├── auth/                     # Autenticação, emissão e validação de tokens JWT
│   │   ├── controllers/
│   │   ├── dtos/
│   │   ├── middleware/
│   │   ├── repositories/
│   │   ├── routes/
│   │   └── services/
│   ├── cadastro/                 # Cadastro e gerenciamento de perfis profissionais
│   │   ├── controllers/
│   │   ├── dtos/
│   │   ├── repositories/
│   │   ├── routes/
│   │   └── services/
│   ├── jornada/                  # Regras de cálculo de escalas, plantões e horas
│   │   ├── __tests__/            # Suíte de testes automatizados das regras
│   │   ├── controllers/
│   │   ├── dtos/
│   │   ├── repositories/
│   │   ├── rules/                # Funções puras de cálculo matemático de jornada
│   │   └── services/
│   └── user/                     # Gestão de usuários da plataforma
│       ├── controllers/
│       ├── dtos/
│       ├── repositories/
│       └── services/
├── shared/                       # Código compartilhado entre domínios
│   ├── constants/                # Códigos de erro HTTP e mensagens padrão
│   ├── database/                 # Instância singleton do PrismaClient
│   ├── decorators/               # Decoradores (ex: @LogExecution)
│   ├── middleware/               # Middlewares globais (errorHandler, rateLimiter)
│   └── utils/                    # Formatadores e validadores utilitários
├── config/                       # Configurações de ambiente, CORS, JWT e Swagger
├── app.ts                        # Configuração dos middlewares do Express
└── index.ts                      # Bootstrap e inicialização do servidor
```

---

## 4. MODELO DE DADOS (PRISMA SCHEMA)

As entidades centrais refletem o fluxo operacional hospitalar:

* `Usuario`: Registro de autenticação com enums de perfil (`Role: ADMIN, GESTOR, PROFISSIONAL, USER`), integridade de dados e auditoria (`createdAt`, `updatedAt`, `deletedAt`).
* `AuthSessao`: Controle de tokens de sessão ativas associadas a cada usuário.
* `TipoProfissional`: Categorias profissionais (ex: Médico Plantonista, Enfermeiro Chefe).
* `Profissional`: Dados cadastrais vinculados ao usuário, incluindo Conselho de Classe e Número de Registro.
* `Escala` & `Plantao`: Planejamento temporal de início e término das coberturas médicas.
* `JornadaExecutada`: Registro pontual dos horários reais de entrada e saída.
* `JornadaCalculada`: Totalizador consolidado contendo:
  - `minutosTrabalhados`
  - `minutosAtraso`
  - `minutosExtras`
  - `minutosNoturnos`

---

## 5. REGRAS DE CÁLCULO DE JORNADA

As regras implementadas em `src/features/jornada/rules/jornada.rules.ts` seguem as seguintes diretrizes:

1. **Minutos Trabalhados:** $\text{Diferença}(FimExecutado - InicioExecutado)$ em minutos.
2. **Atraso:** $\max(0, InicioExecutado - InicioPlanejado)$ em minutos. Não pontua valores negativos para chegadas adiantadas.
3. **Horas Extras:** $\max(0, FimExecutado - FimPlanejado)$ em minutos.
4. **Adicional Noturno:** Varredura minuto a minuto identificando horários entre as 22h00 e as 05h00, considerando inclusive plantões de 12h ou 24h que cruzam a virada do dia.

---

## 6. INSTALAÇÃO E CONFIGURAÇÃO LOCAL

### Pré-requisitos
* Node.js 22+ ou 24+ LTS
* Docker e Docker Compose
* Git

### Passo a Passo

1. **Clonar o Repositório:**
   ```bash
   git clone https://github.com/JJeffersonAraujo/nericare-api.git
   cd nericare-api
   ```

2. **Configurar as Variáveis de Ambiente:**
   Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```
   *Assegure-se de manter credenciais seguras e não versionar o `.env`.*

3. **Subir o Banco de Dados com Docker:**
   ```bash
   docker-compose up -d
   ```
   *Isso iniciará o PostgreSQL na porta `5432` e o PgAdmin na porta `5050`.*

4. **Executar as Migrations do Banco:**
   ```bash
   npx prisma migrate dev
   ```

5. **Iniciar a Aplicação em Desenvolvimento:**
   ```bash
   npm run dev
   ```
   A API estará disponível em: `http://localhost:3000`  
   A documentação Swagger interativa estará em: `http://localhost:3000/docs`

---

## 7. SUÍTE DE TESTES AUTOMATIZADOS

A aplicação conta com testes automatizados executáveis com o test runner nativo do Node.js:

```bash
npm test
```

### Casos de Teste Validados:
* [x] Cálculo exato de minutos trabalhados em jornada padrão diurna (9h = 540 min).
* [x] Identificação de atraso de início de plantão.
* [x] Garantia de atraso zerado em entradas pontuais ou adiantadas.
* [x] Cálculo de horas extras no encerramento tardio do plantão.
* [x] Garantia de horas extras zeradas em saídas antes do planejado.
* [x] Identificação correta de minutos noturnos entre 22h e 05h.
* [x] Garantia de zero minutos noturnos em jornadas estritamente diurnas.
* [x] Cálculo exato de adicionais noturnos em plantão de 12h que cruza a madrugada (19h às 07h).

---

## 8. LIMITAÇÕES CONHECIDAS E ROADMAP

### Limitações Atuais:
- As rotas TSOA são geradas durante a compilação e exigem execução prévia de `npm run tsoa:routes` para sincronização de novos endpoints.
- O cálculo de adicional noturno atual realiza iteração contínua de minutos; para grandes volumes de reprocessamento em lote, uma abordagem puramente matemática por intervalos proporcionará ganho de performance.

### Próximas Entregas (Roadmap):
- [ ] Implementação de testes de integração E2E com Supertest para as rotas de autenticação e login.
- [ ] Configuração de pipeline de CI/CD via GitHub Actions para execução de testes e build a cada pull request.
- [ ] Exportação de espelhos de ponto de plantões em formato PDF/CSV para faturamento hospitalar.
