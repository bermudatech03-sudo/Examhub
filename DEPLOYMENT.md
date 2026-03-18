# ExamHub — Complete Deployment Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET                                     │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                  ┌───────▼────────┐
                  │  Nginx (443)   │  TLS termination, rate limiting
                  │  Reverse Proxy │  WebSocket upgrade
                  └──────┬─────┬──┘
                         │     │
             ┌───────────▼─┐  ┌▼─────────────┐
             │  Next.js 14 │  │  Fastify 4   │
             │  Frontend   │  │  GraphQL API │  Port 4000
             │  Port 3000  │  │  + WebSocket │
             └─────────────┘  └──────┬───────┘
                                     │
              ┌──────────┬───────────┼───────────────┐
              │          │           │               │
         ┌────▼────┐ ┌───▼──┐ ┌─────▼────┐  ┌──────▼──────┐
         │Postgres │ │Redis │ │  MinIO   │  │  Docker     │
         │   16    │ │  7   │ │  (S3)    │  │  (Code Exec)│
         └─────────┘ └──────┘ └──────────┘  └─────────────┘
              │          │
         ┌────▼────┐ ┌───▼────────┐
         │ Prisma  │ │  BullMQ    │
         │   ORM   │ │  Workers   │
         └─────────┘ └────────────┘
```

## Quick Start

### Prerequisites
- Docker 24+ and Docker Compose v2
- Git
- 4GB RAM minimum (8GB recommended)
- Open ports: 80, 443, 3000, 4000

### 1. Clone & Configure

```bash
git clone https://github.com/your-org/examhub.git
cd examhub

# Copy and configure environment
cp .env.example .env
nano .env   # Edit with your values
```

### 2. Generate SSL Certificate (Development)

```bash
make ssl-gen
```

For production, replace `infrastructure/nginx/ssl/cert.pem` and `key.pem`
with your real certificate (e.g., Let's Encrypt via Certbot).

### 3. Start Services

```bash
# Build and start everything
make build
make up

# Run database migrations
make migrate

# Seed with demo data
make seed

# Create MinIO storage bucket
make minio-setup
```

### 4. Access the Platform

| Service     | URL                            | Default Credentials |
|-------------|--------------------------------|---------------------|
| Frontend    | http://localhost:3000          | See below           |
| GraphQL API | http://localhost:4000/graphql  | —                   |
| MinIO Admin | http://localhost:9001          | examhub / (from .env) |

### Demo Credentials

| Role        | Email                    | Password    |
|-------------|--------------------------|-------------|
| Super Admin | admin@examhub.io         | admin123    |
| Org Admin   | orgadmin@examhub.io      | admin123    |
| Examiner    | examiner@examhub.io      | examiner123 |
| Candidate   | student@examhub.io       | student123  |

---

## Tech Stack

### Frontend
| Layer       | Technology            | Version |
|-------------|----------------------|---------|
| Framework   | Next.js (App Router) | 14.x    |
| UI          | React                | 18.x    |
| Styling     | TailwindCSS          | 3.x     |
| State       | Zustand              | 4.x     |
| API Client  | Apollo Client        | 3.x     |
| Code Editor | Monaco Editor        | 4.x     |
| Charts      | Recharts             | 2.x     |
| Animation   | Framer Motion        | 11.x    |

### Backend
| Layer       | Technology    | Version |
|-------------|--------------|---------|
| Runtime     | Node.js      | 20+     |
| Framework   | Fastify      | 4.x     |
| GraphQL     | Mercurius    | 14.x    |
| ORM         | Prisma       | 5.x     |
| Auth        | JWT (@fastify/jwt) | 8.x |
| Cache       | Redis (ioredis) | 5.x  |
| Queue       | BullMQ       | 5.x     |
| Email       | Nodemailer   | 6.x     |
| PDF         | PDFKit       | 0.15.x  |
| Docker SDK  | Dockerode    | 4.x     |

### Infrastructure
| Service     | Technology    |
|-------------|--------------|
| Database    | PostgreSQL 16 |
| Cache/Queue | Redis 7       |
| Object Store| MinIO (S3 API)|
| Proxy       | Nginx 1.25    |
| Code Runner | Docker sandbox|

---

## Database Schema

### Core Tables

```
organizations        → tenants/companies using ExamHub
users                → all user accounts (all roles)
user_sessions        → JWT session tracking
tags                 → question classification
questions            → question bank
question_options     → MCQ answer choices
question_tags        → question ↔ tag relationship
coding_problems      → coding question config + test cases
exams                → exam definitions
exam_questions       → questions assigned to exams
exam_invitations     → per-candidate exam invites
exam_attempts        → candidate exam sessions
answers              → per-question answers
coding_submissions   → code execution results
cheating_logs        → anti-cheat violation records
results              → evaluated exam outcomes
certificates         → issued achievement certificates
notifications        → in-app + email notifications
security_logs        → audit trail
system_settings      → platform config
bulk_import_jobs     → async import tracking
```

---

## API Reference

### Authentication
```graphql
mutation Login($input: LoginInput!)         # Returns JWT token
mutation Register($input: RegisterInput!)   # Create account
mutation ForgotPassword($email: String!)    # Send reset email
mutation ResetPassword(...)                 # Reset with token
query Me                                    # Current user
```

### Exams
```graphql
query GetExams(filter, pagination)          # List exams
query GetExam($id)                          # Single exam detail
query GetAvailableExams                     # Candidate-visible exams
mutation CreateExam($input)                 # New exam
mutation UpdateExam($id, $input)            # Edit exam
mutation PublishExam($id)                   # Make live
mutation AddQuestionsToExam(...)            # Add questions
mutation InviteCandidates(...)              # Send invitations
```

### Exam Taking
```graphql
mutation StartAttempt($examId, $accessCode) # Begin exam
mutation SubmitAnswer($input)               # Save answer
mutation SubmitAttempt($attemptId)          # Finalize exam → Result
mutation ExecuteCode($input)                # Run code in sandbox
mutation LogViolation($input)               # Report anti-cheat event
```

### Results
```graphql
query GetMyResults                          # Candidate results
query GetExamResults($examId)               # All results for exam
query GetExamStats($examId)                 # Aggregated analytics
mutation PublishResults($examId)            # Make results visible
mutation GradeEssay(...)                    # Manual essay grading
```

---

## Anti-Cheat System

### Monitored Events

| Violation             | Trigger                              |
|-----------------------|--------------------------------------|
| TAB_SWITCH            | `document.visibilitychange` event    |
| FULLSCREEN_EXIT       | `fullscreenchange` event             |
| RIGHT_CLICK           | `contextmenu` event (prevented)      |
| COPY_PASTE            | `copy` / `paste` events              |
| KEYBOARD_SHORTCUT     | F12, Ctrl+Shift+I/J/C, Ctrl+U        |

### Auto-Submit Logic

```
violationCount >= 3
  → attempt.status = DISQUALIFIED
  → evaluationEngine.evaluate(attemptId)
  → candidate notified by email
```

---

## Code Execution Engine

### Flow

```
Candidate submits code
  → Docker container spawned (isolated, no network)
  → Code written to container filesystem
  → Executed with stdin from test case
  → stdout compared to expectedOutput
  → Container removed
  → Result stored in coding_submissions
```

### Resource Limits per Container

| Resource | Default Limit |
|----------|--------------|
| CPU      | 50% (CpuQuota=50000) |
| Memory   | 256 MB       |
| Network  | None (isolated) |
| Time     | 5000ms default, configurable per problem |

### Supported Languages

| Language   | Docker Image           |
|------------|------------------------|
| Python     | python:3.12-alpine     |
| Java       | openjdk:21-alpine      |
| C++        | gcc:13-alpine          |
| JavaScript | node:20-alpine         |

---

## Security Model

### RBAC Permissions Matrix

| Permission              | SUPER_ADMIN | ORG_ADMIN | EXAMINER | CANDIDATE |
|-------------------------|:-----------:|:---------:|:--------:|:---------:|
| Manage organizations    | ✅          | ❌        | ❌       | ❌        |
| Manage all users        | ✅          | ❌        | ❌       | ❌        |
| Manage org users        | ✅          | ✅        | ❌       | ❌        |
| Create exams            | ✅          | ✅        | ✅       | ❌        |
| Publish exams           | ✅          | ✅        | ✅       | ❌        |
| Create questions        | ✅          | ✅        | ✅       | ❌        |
| Take exams              | ❌          | ❌        | ❌       | ✅        |
| View own results        | ❌          | ❌        | ❌       | ✅        |
| View all exam results   | ✅          | ✅        | ✅       | ❌        |
| Live monitoring         | ✅          | ✅        | ✅       | ❌        |
| Grade essays            | ✅          | ✅        | ✅       | ❌        |
| View security logs      | ✅          | ❌        | ❌       | ❌        |
| System settings         | ✅          | ❌        | ❌       | ❌        |

### Security Measures

- **JWT Auth** — signed tokens, Redis blacklist on logout
- **Rate Limiting** — 100 req/min global, 5 req/min on login
- **Input Validation** — Zod schemas on all inputs
- **SQL Injection** — Prisma parameterized queries
- **XSS** — React auto-escaping + Helmet headers
- **CSRF** — SameSite cookies + CORS policy
- **Code Sandbox** — No network, resource-capped Docker containers
- **Security Logging** — All auth events logged to `security_logs`

---

## Folder Structure

```
examhub/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma           # Complete DB schema
│   ├── src/
│   │   ├── server.ts               # Fastify bootstrap
│   │   ├── graphql/
│   │   │   ├── schema/index.ts     # GraphQL SDL
│   │   │   └── resolvers/
│   │   │       ├── index.ts        # Merged resolvers
│   │   │       ├── auth.ts         # Auth resolvers
│   │   │       └── exam.ts         # Exam resolvers
│   │   ├── middleware/
│   │   │   └── context.ts          # GraphQL context + auth
│   │   ├── services/
│   │   │   ├── exam-engine.ts      # Core exam logic
│   │   │   ├── evaluation-engine.ts# Auto-grading
│   │   │   ├── code-execution.ts   # Docker sandbox
│   │   │   ├── certificate.ts      # PDF generation
│   │   │   ├── email.ts            # SMTP service
│   │   │   ├── s3.ts               # File storage
│   │   │   └── security-logger.ts  # Audit logging
│   │   ├── websocket/
│   │   │   └── handler.ts          # Real-time proctoring WS
│   │   ├── workers/
│   │   │   └── index.ts            # BullMQ background workers
│   │   └── seed.ts                 # Demo data seeder
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx          # Root layout (Apollo provider)
│   │   │   ├── page.tsx            # Landing page
│   │   │   ├── globals.css         # Dark theme + component classes
│   │   │   ├── auth/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── layout.tsx      # Dashboard layout + auth guard
│   │   │   │   ├── page.tsx        # Role-aware dashboard home
│   │   │   │   ├── exams/
│   │   │   │   │   ├── page.tsx    # Exam list
│   │   │   │   │   └── new/page.tsx# Create exam
│   │   │   │   ├── questions/
│   │   │   │   │   ├── page.tsx    # Question bank
│   │   │   │   │   └── new/page.tsx# Create question
│   │   │   │   ├── results/
│   │   │   │   │   ├── page.tsx    # Results list
│   │   │   │   │   └── [id]/page.tsx# Result detail
│   │   │   │   ├── certificates/
│   │   │   │   │   └── page.tsx    # Certificate gallery
│   │   │   │   ├── monitor/
│   │   │   │   │   └── page.tsx    # Live exam monitor
│   │   │   │   └── analytics/
│   │   │   │       └── page.tsx    # Charts & analytics
│   │   │   ├── exam/
│   │   │   │   └── [id]/page.tsx   # Full-screen exam interface
│   │   │   └── admin/
│   │   │       ├── layout.tsx      # Admin layout + SUPER_ADMIN guard
│   │   │       └── page.tsx        # Admin dashboard
│   │   ├── components/
│   │   │   └── dashboard/
│   │   │       └── Sidebar.tsx     # Navigation sidebar
│   │   ├── hooks/
│   │   │   ├── useAntiCheat.ts     # Violation detection
│   │   │   └── useWebSocket.ts     # WS connection manager
│   │   ├── lib/
│   │   │   ├── apollo.ts           # Apollo client config
│   │   │   └── queries.ts          # All GQL queries/mutations
│   │   └── store/
│   │       └── index.ts            # Zustand stores (auth, exam)
│   ├── Dockerfile
│   ├── next.config.js
│   ├── package.json
│   └── tailwind.config.js
│
├── infrastructure/
│   └── nginx/
│       └── nginx.conf
│
├── docker-compose.yml
├── Makefile
├── .env.example
└── DEPLOYMENT.md
```

---

## Production Deployment

### Environment Hardening

1. **Change all secrets** in `.env`:
   - `JWT_SECRET` — minimum 64 random characters
   - `POSTGRES_PASSWORD` — strong random password
   - `REDIS_PASSWORD` — strong random password
   - `MINIO_ROOT_PASSWORD` — strong random password

2. **TLS Certificate** — Replace self-signed with Let's Encrypt:
   ```bash
   certbot certonly --standalone -d yourdomain.com
   cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem infrastructure/nginx/ssl/cert.pem
   cp /etc/letsencrypt/live/yourdomain.com/privkey.pem infrastructure/nginx/ssl/key.pem
   ```

3. **Update URLs** in `.env`:
   ```env
   FRONTEND_URL=https://yourdomain.com
   NEXT_PUBLIC_API_URL=https://yourdomain.com
   NEXT_PUBLIC_WS_URL=wss://yourdomain.com
   ```

4. **Pull Docker images** for code execution:
   ```bash
   docker pull python:3.12-alpine
   docker pull openjdk:21-alpine
   docker pull gcc:13-alpine
   docker pull node:20-alpine
   ```

### Scaling

For high-load deployments:

- **Backend** — Scale horizontally behind a load balancer. Redis handles session sharing.
- **Workers** — Scale BullMQ workers independently.
- **Database** — Use PgBouncer for connection pooling. Consider read replicas for analytics.
- **Code Execution** — Move to a dedicated execution cluster or use AWS Lambda/Fargate.

### Backup

```bash
# Database backup
docker compose exec postgres pg_dump -U examhub examhub > backup_$(date +%Y%m%d).sql

# Restore
cat backup.sql | docker compose exec -T postgres psql -U examhub examhub
```

---

## Extending the Platform

### Adding a New Question Type
1. Add enum value to `QuestionType` in `prisma/schema.prisma`
2. Add to GraphQL schema `QuestionType` enum
3. Handle in `exam-engine.ts` `submitAnswer()` evaluation
4. Add UI case in `QuestionAnswerArea` component

### Adding a New Coding Language
1. Add to `CodingLanguage` enum in schema
2. Add to `LANGUAGE_IMAGES`, `LANGUAGE_COMMANDS`, `LANGUAGE_EXTENSIONS` in `code-execution.ts`
3. Pull the Docker image on your server

### Adding SSO / OAuth
1. Install `@fastify/oauth2`
2. Add OAuth routes in `server.ts`
3. Create/link users in the callback handler
4. Update frontend login page with OAuth buttons
