# Job Application Evaluator

A high-performance backend service designed to evaluate job applications by analyzing candidate CVs and project submissions using AI-powered evaluation with modern technology stack. This application provides blazing-fast response times and excellent performance by leveraging message brokers for handling intensive computational tasks asynchronously.

## Description

The Job Application Evaluator is a specialized backend system that automates the evaluation process of job applications. It intelligently analyzes candidate CVs and project submissions against ground truth documents stored in a vector database, providing comprehensive evaluation results powered by OpenAI's GPT-4o-mini model. The system is built with performance in mind, utilizing asynchronous processing through message brokers to ensure low latency and high throughput even under heavy workloads.

## Tech Stack

- **Framework**: [Hono.js](https://hono.dev/) - Ultra-fast web framework
- **Language**: TypeScript - Type-safe development
- **Runtime**: [Bun](https://bun.sh/) - Fast all-in-one JavaScript runtime
- **Message Broker**: RabbitMQ - Reliable async message processing
- **Database**: PostgreSQL - Robust relational database
- **ORM**: Prisma - Type-safe database client
- **AI Engine**: OpenAI API (GPT-4o-mini) - Intelligent evaluation
- **Vector Database**: ChromaDB - Semantic search and retrieval

## Architecture

### Overview

The system follows an asynchronous processing architecture utilizing a message broker pattern to handle computationally intensive AI evaluation tasks. This approach ensures optimal performance by:

1. **Non-blocking Operations**: API endpoints respond immediately without waiting for AI processing
2. **Scalability**: Multiple worker processes can consume messages in parallel
3. **Reliability**: Message persistence ensures no evaluation jobs are lost
4. **High Throughput**: Low latency responses with background processing for heavy tasks
5. **Resource Efficiency**: Better resource utilization through async task distribution

### Why Message Broker?

The message broker approach was chosen as the most efficient solution for background worker async tasks because:

- **Complete Documentation**: RabbitMQ has extensive, well-maintained documentation
- **High Performance**: Excellent throughput with minimal latency overhead
- **Proven Reliability**: Battle-tested in production environments worldwide
- **Flexible Routing**: Advanced message routing capabilities
- **Dead Letter Queues**: Built-in failure handling mechanisms
- **Monitoring Tools**: Rich ecosystem of monitoring and management tools

### System Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│                     Hono.js API                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐      │
│  │ /upload  │────▶│/evaluate │────▶│/result/  │      │
│  │          │     │          │     │ :jobId   │      │
│  └────┬─────┘     └────┬─────┘     └────┬─────┘      │
│       │                │                 │             │
└───────┼────────────────┼─────────────────┼─────────────┘
        │                │                 │
        ▼                ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  PostgreSQL  │  │   RabbitMQ   │  │  PostgreSQL  │
│   (Prisma)   │  │   Publisher  │  │   (Prisma)   │
└──────────────┘  └──────┬───────┘  └──────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │   RabbitMQ   │
                  │   Consumer   │
                  │   (Worker)   │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐     ┌──────────────┐
                  │   ChromaDB   │◀───▶│  OpenAI API  │
                  │ Vector Store │     │  GPT-4o-mini │
                  └──────────────┘     └──────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  PostgreSQL  │
                  │  Update Job  │
                  └──────────────┘
```

### Endpoint Flows

#### 1. `/upload` Endpoint Flow

```
┌─────────────────┐
│  Client Upload  │
│   (PDF File)    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  POST /upload                           │
│  Content-Type: multipart/form-data      │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Parse PDF File                         │
│  - Extract text content                 │
│  - Structure data                       │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Determine Document Type                │
│  - CV or Submission                     │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Store in PostgreSQL via Prisma         │
│  - Create CV or Submission record       │
│  - Store structured description         │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Return Response                        │
│  { cvId: string } or                    │
│  { submissionId: string }               │
└─────────────────────────────────────────┘
```

**Process Details:**

1. Client uploads PDF file using multipart/form-data
2. Backend receives and parses the PDF content
3. Extracted text is structured into a formatted description
4. Document is classified and stored in appropriate table (CV or Submission)
5. Unique ID is generated and returned to client

#### 2. `/evaluate` Endpoint Flow

```
┌─────────────────────────────────────────┐
│  Client Request                         │
│  { title, cvId, submissionId }          │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  POST /evaluate                         │
│  Content-Type: application/json         │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Validate Request Body                  │
│  - Check cvId exists                    │
│  - Check submissionId exists            │
│  - Validate title                       │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Create Job Record                      │
│  - status: "pending"                    │
│  - Link to CV and Submission            │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Publish Message to RabbitMQ            │
│  Message: {                             │
│    jobId, cvId,                         │
│    submissionId, title                  │
│  }                                      │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Return Immediate Response              │
│  { id: jobId, status: "pending" }       │
└─────────────────────────────────────────┘
         │
         │ (Async Processing)
         ▼
┌─────────────────────────────────────────┐
│  RabbitMQ Consumer (Worker Process)     │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Fetch CV and Submission Data           │
│  - Retrieve from PostgreSQL             │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Query ChromaDB Vector Store            │
│  - Search by title                      │
│  - Find relevant ground truth docs      │
│  - Get matching support documents       │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Execute RAG Pipeline                   │
│  - Context: Ground truth docs           │
│  - Input: CV + Submission data          │
│  - Send to OpenAI GPT-4o-mini           │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Process AI Response                    │
│  - Parse evaluation results             │
│  - Structure output                     │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Update Job Record                      │
│  - status: "completed"                  │
│  - result: AI evaluation JSON           │
└─────────────────────────────────────────┘
```

**Process Details:**

1. Client sends evaluation request with job details
2. System validates the referenced CV and Submission exist
3. New Job record created with "pending" status
4. Message published to RabbitMQ queue with job details
5. API immediately returns jobId and status to client
6. Worker consumes message asynchronously
7. Worker fetches CV and Submission from database
8. ChromaDB queried for relevant ground truth documents based on title
9. RAG pipeline executes with context from vector DB
10. OpenAI API evaluates candidate submission against ground truth
11. Results parsed and Job record updated to "completed" with results

#### 3. `/result/:jobId` Endpoint Flow

```
┌─────────────────────────────────────────┐
│  Client Request                         │
│  GET /result/{jobId}                    │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Validate jobId Parameter               │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Query PostgreSQL via Prisma            │
│  - Find Job by ID                       │
│  - Include related CV and Submission    │
└────────┬────────────────────────────────┘
         │
         ├─── Job Not Found
         │    │
         │    ▼
         │    ┌────────────────────────────┐
         │    │ Return 404 Error           │
         │    └────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Return Job Details                     │
│  {                                      │
│    id: string,                          │
│    status: "pending" | "completed",     │
│    result: JsonValue | null,            │
│    cv_id: string,                       │
│    submission_id: string,               │
│    created_at: Date                     │
│  }                                      │
└─────────────────────────────────────────┘
```

**Process Details:**

1. Client requests evaluation results with specific jobId
2. System validates jobId format
3. Database queried for Job record
4. If Job exists, full details returned including:
   - Current status (pending/completed)
   - Evaluation results (if completed)
   - Related CV and Submission IDs
   - Creation timestamp
5. If Job not found, 404 error returned

### RAG Pipeline Details

The Retrieval-Augmented Generation (RAG) pipeline works as follows:

1. **Document Indexing**: Ground truth documents are pre-embedded and stored in ChromaDB
2. **Query Phase**: When evaluation starts, the system queries ChromaDB using the job title
3. **Retrieval**: Most relevant ground truth documents are retrieved based on semantic similarity
4. **Context Building**: Retrieved documents are formatted as context for the AI
5. **Generation**: GPT-4o-mini generates evaluation based on:
   - Candidate's CV content
   - Project submission description
   - Retrieved ground truth documents as reference
6. **Output**: Structured evaluation results stored in Job record

## Database Schema (ERD)

```
┌─────────────────────────────────────────────────────────┐
│                          Job                            │
├─────────────────────────────────────────────────────────┤
│ PK  id              String (cuid)                       │
│     status          String                              │
│     result          Json (nullable)                     │
│ FK  cv_id           String                              │
│ FK  submission_id   String                              │
│     created_at      DateTime                            │
└────────┬────────────────────────┬───────────────────────┘
         │                        │
         │ Many                   │ Many
         │                        │
         ▼ One                    ▼ One
┌─────────────────────┐  ┌─────────────────────────────┐
│        Cv           │  │       Submission            │
├─────────────────────┤  ├─────────────────────────────┤
│ PK  id       String │  │ PK  id          String      │
│     description     │  │     description String      │
│     created_at      │  │     created_at  DateTime    │
└─────────────────────┘  └─────────────────────────────┘
```

### Relationships

- **Job to CV**: Many-to-One relationship
  - One CV can be used in multiple Job evaluations
  - Each Job references exactly one CV
- **Job to Submission**: Many-to-One relationship
  - One Submission can be evaluated in multiple Jobs
  - Each Job references exactly one Submission

### Table Descriptions

**Job Table**

- Stores evaluation job records
- `status`: Current state of the job ("pending" or "completed")
- `result`: JSON object containing AI evaluation results (nullable until completed)
- Links to both CV and Submission being evaluated

**CV Table**

- Stores parsed CV documents
- `description`: Structured text content extracted from CV PDF
- Reusable across multiple evaluation jobs

**Submission Table**

- Stores project submission documents
- `description`: Structured text content extracted from submission PDF
- Reusable across multiple evaluation jobs

## API Documentation

| Endpoint         | Method | Body                                                                | Headers                             | Response                                                                                                                            |
| ---------------- | ------ | ------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `/upload`        | POST   | Form-data with PDF file                                             | `Content-Type: multipart/form-data` | `{ "cvId": "string" }` or `{ "submissionId": "string" }`                                                                            |
| `/evaluate`      | POST   | `{ "title": "string", "cvId": "string", "submissionId": "string" }` | `Content-Type: application/json`    | `{ "id": "string", "status": "string" }`                                                                                            |
| `/result/:jobId` | GET    | -                                                                   | -                                   | `{ "id": "string", "status": "string", "result": "JsonValue", "cv_id": "string", "submission_id": "string", "created_at": "Date" }` |

### API Details

#### POST `/upload`

Upload a CV or project submission PDF file for parsing and storage.

**Request:**

- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: PDF file

**Response:**

```typescript
{
  "cvId": "string",
  "submissionId": "string" // if CV uploaded
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@resume.pdf"
```

#### POST `/evaluate`

Start an evaluation job for a candidate's CV and project submission.

**Request:**

- Method: `POST`
- Content-Type: `application/json`
- Body:

```typescript
{
  "title": "string",        // Job title for ground truth document matching
  "cvId": "string",         // ID from /upload endpoint
  "submissionId": "string"  // ID from /upload endpoint
}
```

**Response:**

```typescript
{
  "id": "string",      // Job ID for tracking
  "status": "string"   // Initial status: "pending"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Software Engineer",
    "cvId": "clx1234567890",
    "submissionId": "clx0987654321"
  }'
```

#### GET `/result/:jobId`

Retrieve the evaluation results for a specific job.

**Request:**

- Method: `GET`
- URL Parameter: `jobId` (string)

**Response:**

```typescript
{
  "id": "string",
  "status": "string",           // "processing" or "completed"
  "result": "JsonValue",        // AI evaluation results (null if pending)
  "cv_id": "string",
  "submission_id": "string",
  "created_at": "Date"
}
```

**Example:**

```bash
curl http://localhost:3000/result/clx1234567890
```

## Installation & Setup

### Prerequisites

- [Bun](https://bun.sh/) (>= 1.0.0)
- [PostgreSQL](https://www.postgresql.org/) (>= 14)
- [RabbitMQ](https://www.rabbitmq.com/) (>= 3.11)
- [ChromaDB](https://www.trychroma.com/)
- OpenAI API Key

### Installation Steps

1. **Clone the repository**

```bash
git clone https://github.com/mhmdd-farhan/job-application-evaluator.git
cd job-application-evaluator
```

2. **Install dependencies**

```bash
bun install
```

3. **Environment Configuration**

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/job_evaluator"

# RabbitMQ
AMQP_URL="amqp://localhost:5672"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# ChromaDB
CHROMADB_URL="http://localhost:8000"
CHROMA_TENANT="your-chroma-tenant"

```

4. **Database Setup**

```bash
# Generate Prisma Client
bunx prisma generate

# Run migrations
bunx prisma migrate dev
```

5. **Start Required Services**

```bash
# Start PostgreSQL (if not running)
# Start RabbitMQ
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management

# Start ChromaDB
docker run -d --name chromadb -p 8000:8000 chromadb/chroma
```

6. **Run the Application**

```bash
# Development mode
bun run dev

# Production mode
bun run start

# Start worker process (in separate terminal)
bun run worker
```

## Contributing

We welcome contributions to improve the Job Application Evaluator! Here's how you can contribute:

### Development Setup

1. **Fork and Clone**

```bash
git clone https://github.com/your-username/job-application-evaluator.git
cd job-application-evaluator
```

2. **Install Dependencies**

```bash
bun install
```

3. **Environment Setup**

```bash
cp .env.example .env
# Configure your local environment variables
```

4. **Database Setup**

```bash
bunx prisma generate
bunx prisma migrate dev
```

5. **Create a Feature Branch**

```bash
git checkout -b feature/your-feature-name
```

### Development Workflow

- Use TypeScript for all new code
- Follow existing code style and conventions
- Write meaningful commit messages
- Test your changes thoroughly before submitting
- Update documentation if needed

### Code Style

- Use TypeScript strict mode
- Follow Hono.js best practices
- Use Prisma for database operations
- Implement proper error handling
- Add type definitions for all functions

### Submitting Changes

1. Commit your changes with descriptive messages
2. Push to your fork
3. Create a Pull Request with:
   - Clear description of changes
   - Reference to any related issues
   - Screenshots (if UI changes)
   - Test results

### Code Review Process

- All PRs require review before merging
- Address feedback and comments
- Keep PRs focused and reasonably sized
- Ensure CI/CD checks pass

## Project Structure

```
job-application-evaluator/
├── src/
│   ├── index.ts              # Main application entry
│   ├── routes/               # API endpoints
│   ├── services/             # Business logic
│   ├── workers/              # RabbitMQ consumers
│   ├── lib/                  # Utilities and helpers
│   └── types/                # TypeScript type definitions
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Database migrations
├── generated/
│   └── prisma/               # Generated Prisma client
├── .env.example              # Environment template
├── package.json
└── tsconfig.json
```

## License

[MIT License](LICENSE)

## Support

For issues, questions, or contributions, please visit:

- GitHub Issues: [Create an issue](https://github.com/mhmdd-farhan/job-application-evaluator/issues)
- Pull Requests: [Submit a PR](https://github.com/mhmdd-farhan/job-application-evaluator/pulls)

## Acknowledgments

Built with modern technologies:

- [Hono.js](https://hono.dev/)
- [Bun](https://bun.sh/)
- [Prisma](https://www.prisma.io/)
- [RabbitMQ](https://www.rabbitmq.com/)
- [ChromaDB](https://www.trychroma.com/)
- [OpenAI](https://openai.com/)
