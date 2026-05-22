import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user for web admin panel
  // Password can be set via ADMIN_PASSWORD env var (default: admin123)
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const password = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: 'admin' },
    update: { password },
    create: {
      email: 'admin',
      password,
      name: 'Admin',
      role: 'admin',
    },
  });
  console.log(`Admin user: admin / ${adminPassword}`);
  console.log('  Change password via ADMIN_PASSWORD env var');

  // Create default system providers
  const providers = [
    {
      name: 'DeepSeek',
      type: 'official',
      website: 'https://www.deepseek.com',
      openaiApiBase: 'https://api.deepseek.com',
      anthropicApiBase: null,
      googleApiBase: null,
      sort: 1,
      isActive: true,
    },
    {
      name: 'OpenAI',
      type: 'official',
      website: 'https://platform.openai.com',
      openaiApiBase: 'https://api.openai.com/v1',
      anthropicApiBase: null,
      googleApiBase: null,
      sort: 2,
      isActive: true,
    },
    {
      name: 'Anthropic',
      type: 'official',
      website: 'https://www.anthropic.com',
      openaiApiBase: null,
      anthropicApiBase: 'https://api.anthropic.com',
      googleApiBase: null,
      sort: 3,
      isActive: true,
    },
  ];

  for (const p of providers) {
    await prisma.systemProvider.upsert({
      where: { name: p.name },
      update: p,
      create: p,
    });
  }
  console.log(`Created ${providers.length} system providers`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
