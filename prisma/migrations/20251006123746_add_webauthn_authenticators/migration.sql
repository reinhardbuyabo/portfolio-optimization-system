-- CreateTable
CREATE TABLE "public"."Authenticator" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "credentialID" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "credentialPublicKey" TEXT NOT NULL,
    "counter" BIGINT NOT NULL,
    "credentialDeviceType" TEXT NOT NULL,
    "credentialBackedUp" BOOLEAN NOT NULL,
    "transports" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Authenticator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Authenticator_credentialID_key" ON "public"."Authenticator"("credentialID");

-- CreateIndex
CREATE UNIQUE INDEX "Authenticator_userId_credentialID_key" ON "public"."Authenticator"("userId", "credentialID");

-- AddForeignKey
ALTER TABLE "public"."Authenticator" ADD CONSTRAINT "Authenticator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
