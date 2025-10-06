// prisma/seed.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const data = [
    { name: 'Ing. Oscar Paz',   course: 'Curso A' },
    { name: 'Ing. Carlos Tezo', course: 'Curso B' },
    { name: 'Ing. Mario Lopez', course: 'Curso C' },
  ];
  for (const p of data) {
    await prisma.professor.upsert({
      where: { name: p.name },
      create: p,
      update: p,
    });
  }
  console.log('Seed listo');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
