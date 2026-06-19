-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('SECURITY', 'PERFORMANCE', 'STYLE', 'BUG', 'TESTING');

-- CreateEnum
CREATE TYPE "Persona" AS ENUM ('SENIOR_ENGINEER', 'SECURITY_ENGINEER', 'PERFORMANCE_ENGINEER', 'STARTUP_CTO');

-- CreateEnum
CREATE TYPE "AutoFixStatus" AS ENUM ('PENDING', 'DRAFT_OPENED', 'REJECTED', 'FAILED');

-- CreateTable
CREATE TABLE "Installation" (
    "id" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "githubId" BIGINT NOT NULL,
    "accountLogin" TEXT NOT NULL,
    "suspendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Installation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "githubId" BIGINT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "installationId" TEXT,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "previousScore" DOUBLE PRECISION,
    "scoreDelta" DOUBLE PRECISION,
    "persona" "Persona" NOT NULL,
    "summary" TEXT,
    "positives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "healthImpact" TEXT NOT NULL DEFAULT 'NEUTRAL',
    "testCoverage" TEXT NOT NULL DEFAULT 'MISSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repositoryId" TEXT NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "severity" "Severity" NOT NULL,
    "category" "Category" NOT NULL,
    "description" TEXT NOT NULL,
    "suggestion" TEXT,
    "fixSnippet" TEXT,
    "fixLanguage" TEXT,
    "reviewId" TEXT NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthScore" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" DOUBLE PRECISION NOT NULL,
    "repositoryId" TEXT NOT NULL,

    CONSTRAINT "HealthScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseNote" (
    "id" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mergedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repositoryId" TEXT NOT NULL,

    CONSTRAINT "ReleaseNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL,
    "touchesAuth" BOOLEAN NOT NULL,
    "touchesPayments" BOOLEAN NOT NULL,
    "touchesMigrations" BOOLEAN NOT NULL,
    "filesChanged" INTEGER NOT NULL,
    "linesChanged" INTEGER NOT NULL,
    "hasNoNewTests" BOOLEAN NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "level" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechDebtSnapshot" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "debtScore" DOUBLE PRECISION NOT NULL,
    "missingTestsPct" DOUBLE PRECISION NOT NULL,
    "largeFunctionsCount" INTEGER NOT NULL,
    "duplicateLogicCount" INTEGER NOT NULL,
    "repositoryId" TEXT NOT NULL,

    CONSTRAINT "TechDebtSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoFixPR" (
    "id" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "prNumber" INTEGER,
    "status" "AutoFixStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewId" TEXT NOT NULL,

    CONSTRAINT "AutoFixPR_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Installation_apiKey_key" ON "Installation"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "Installation_githubId_key" ON "Installation"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_githubId_key" ON "Repository"("githubId");

-- CreateIndex
CREATE INDEX "Repository_owner_name_idx" ON "Repository"("owner", "name");

-- CreateIndex
CREATE INDEX "Review_author_idx" ON "Review"("author");

-- CreateIndex
CREATE INDEX "Review_createdAt_idx" ON "Review"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_repositoryId_prNumber_key" ON "Review"("repositoryId", "prNumber");

-- CreateIndex
CREATE INDEX "Issue_reviewId_idx" ON "Issue"("reviewId");

-- CreateIndex
CREATE INDEX "Issue_category_idx" ON "Issue"("category");

-- CreateIndex
CREATE INDEX "Issue_severity_idx" ON "Issue"("severity");

-- CreateIndex
CREATE INDEX "HealthScore_repositoryId_date_idx" ON "HealthScore"("repositoryId", "date");

-- CreateIndex
CREATE INDEX "ReleaseNote_mergedAt_idx" ON "ReleaseNote"("mergedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseNote_repositoryId_prNumber_key" ON "ReleaseNote"("repositoryId", "prNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RiskAssessment_reviewId_key" ON "RiskAssessment"("reviewId");

-- CreateIndex
CREATE INDEX "TechDebtSnapshot_repositoryId_date_idx" ON "TechDebtSnapshot"("repositoryId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AutoFixPR_reviewId_key" ON "AutoFixPR"("reviewId");

-- AddForeignKey
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "Installation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthScore" ADD CONSTRAINT "HealthScore_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseNote" ADD CONSTRAINT "ReleaseNote_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechDebtSnapshot" ADD CONSTRAINT "TechDebtSnapshot_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoFixPR" ADD CONSTRAINT "AutoFixPR_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
