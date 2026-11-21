-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "parceiraId" TEXT;

-- CreateTable
CREATE TABLE "Parceira" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "telefone" TEXT,
    "comissao" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "userId" TEXT,
    "token" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parceira_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Parceira_codigo_key" ON "Parceira"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Parceira_token_key" ON "Parceira"("token");

-- CreateIndex
CREATE INDEX "Order_parceiraId_idx" ON "Order"("parceiraId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_parceiraId_fkey" FOREIGN KEY ("parceiraId") REFERENCES "Parceira"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parceira" ADD CONSTRAINT "Parceira_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
