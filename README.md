# Synapse

**Agent-Native Skill Composition Engine**

Synapse is a production-grade web application that allows users to define structured "skill nodes" in markdown (stored in GitHub), parse them into a capability graph, and compose executable skill chains for AI agents.

Each node in the graph is **executable** — it includes activation conditions, I/O schemas, dependencies, procedures, and evaluation logic.

## Architecture

- **Next.js 14** (App Router) with TypeScript strict mode
- **TailwindCSS** for styling
- **React Flow** for interactive skill graph visualization
- **NextAuth** for GitHub OAuth
- **Prisma ORM** with PostgreSQL (Neon compatible)
- **Zod** for strict YAML schema validation
- **Gray Matter** for markdown frontmatter parsing

## Features

- GitHub repository sync with recursive tree fetch
- Strict YAML schema validation for skill definitions
- Directed dependency graph with cycle detection
- Activation scoring engine (trigger matching, domain relevance, context overlap)
- Execution planner with topological sort and context budget management
- Agent composition API (`POST /api/agent/compose`)
- Interactive React Flow graph visualization
- Skill editor with commit-to-GitHub support
- Webhook support for automatic re-sync on push
- Analytics dashboard (skill count, dependency depth, cycles, orphans)
- Rate-limited compose endpoint
- Encrypted GitHub token storage

## Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)
- GitHub OAuth App

## Setup

### 1. Clone and Install

```bash
git clone <your-repo-url> synapse
cd synapse
npm install
```

### 2. Create GitHub OAuth App

1. Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Set:
   - **Application name**: Synapse
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
3. Note the **Client ID** and generate a **Client Secret**

### 3. Create Neon Database

1. Go to [neon.tech](https://neon.tech) and create a new project
2. Create a database named `synapse`
3. Copy the connection string

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/synapse?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<run: openssl rand -base64 32>"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
TOKEN_ENCRYPTION_KEY="<run: openssl rand -hex 32>"
GITHUB_WEBHOOK_SECRET="<run: openssl rand -hex 20>"
```

### 5. Initialize Database

```bash
npx prisma db push
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Setting Up Webhooks

To enable automatic sync when skills are pushed to GitHub:

1. In Synapse, connect a repository
2. In your GitHub repo → Settings → Webhooks → Add webhook:
   - **Payload URL**: `https://your-domain.com/api/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: Same as `GITHUB_WEBHOOK_SECRET` in your `.env`
   - **Events**: Just the `push` event
3. Synapse will automatically re-sync skills on each push to the tracked branch

## Skill Node Schema

Every skill markdown file must contain YAML frontmatter with this structure:

```yaml
---
title: string
description: string
version: "1.0.0"  # semver
domain: string
priority: 0.0-1.0
activation:
  triggers:
    - keyword1
    - keyword2
  required_context:
    - context_item
inputs:
  - name: input_name
    schema: "type description"
    required: true
outputs:
  - name: output_name
    schema: "type description"
dependencies:
  required:
    - Other Skill Title
  optional:
    - Another Skill Title
context_budget_cost: 1.0
evaluation:
  success_criteria:
    - criterion1
  failure_modes:
    - failure1
---
```

The markdown body must include:

```markdown
## Procedure

Step-by-step execution instructions.

## Reasoning

Why this skill exists and when it should dominate.

## References

Optional links to related skills.
```

## Example Skill Repository

The `example-skills/` directory contains a complete example with four interconnected trading skills:

```
example-skills/
  index.md
  skills/
    volatility-estimation.md
    risk-assessment.md
    position-sizing.md
    trade-execution.md
```

Push this to a GitHub repo and connect it to Synapse to see the full system in action.

## API Reference

### Agent Composition

```
POST /api/agent/compose
```

**Body:**
```json
{
  "repositoryId": "string",
  "query": "string",
  "contextState": ["string"],
  "contextBudget": 10
}
```

**Response:**
```json
{
  "activationRanking": [],
  "selectedRootSkill": {},
  "executionPlan": {
    "orderedSkills": [],
    "reasoning": [],
    "contextUsage": 7.0,
    "contextBudget": 10,
    "unresolvedDependencies": []
  },
  "graphAnalysis": {},
  "reasoning": []
}
```

### Other Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/github/repos` | List user's GitHub repos |
| GET | `/api/github/branches?repo=owner/name` | List branches |
| GET/POST | `/api/repositories` | List/create connected repos |
| GET/DELETE | `/api/repositories/[id]` | Get/delete repository |
| POST | `/api/repositories/[id]/sync` | Re-sync repository |
| GET | `/api/repositories/[id]/analytics` | Graph analytics |
| GET | `/api/skills/[id]` | Get skill details |
| POST | `/api/skills/[id]/commit` | Commit skill changes to GitHub |
| POST | `/api/webhooks/github` | GitHub webhook receiver |

## Deployment

### Vercel

1. Push to GitHub
2. Import in Vercel
3. Add all environment variables
4. Set Node.js runtime (not Edge) in project settings
5. Deploy

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## License

MIT
