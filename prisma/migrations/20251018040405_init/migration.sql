-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" JSONB NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);
