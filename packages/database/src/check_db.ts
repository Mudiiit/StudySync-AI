import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const conversations = await prisma.tutorConversation.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      messages: {
        include: {
          responses: true,
        },
      },
    },
  });
  console.log("Result:", JSON.stringify(conversations, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
