import { prisma } from '../db/prisma';

async function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.error('Please provide a user ID.');
    process.exit(1);
  }

  const session = await prisma.session.create({
    data: {
      userId: userId,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      sessionToken: crypto.randomUUID(),
    },
  });

  console.log(session.sessionToken);
}

main();
