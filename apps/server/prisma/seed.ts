import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const password = await bcrypt.hash('123456', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin' },
    update: { role: 'admin' },
    create: {
      email: 'admin',
      password,
      name: 'Admin',
      role: 'admin',
    },
  });
  console.log(`Admin user: admin / 123456`);

  // Create a regular user for testing
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@cc-models.app' },
    update: {},
    create: {
      email: 'user@cc-models.app',
      password: userPassword,
      name: 'Test User',
      role: 'user',
    },
  });
  console.log(`Test user: ${user.email} / user123`);

  // Create some system providers
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
      name: 'OpenAI Official',
      type: 'official',
      website: 'https://platform.openai.com',
      openaiApiBase: 'https://api.openai.com/v1',
      anthropicApiBase: null,
      googleApiBase: null,
      sort: 2,
      isActive: true,
    },
    {
      name: 'Anthropic Official',
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

  // Create sample ads
  const ads = [
    {
      id: 'seed-ad-popup',
      type: 'popup',
      title: 'CC Models 专业版',
      htmlContent: '<div style="text-align:center;padding:20px"><h3>🚀 升级到 CC Models 专业版</h3><p>解锁全部 AI 供应商和高级功能</p><button style="background:#6366f1;color:white;border:none;padding:8px 24px;border-radius:6px;margin-top:12px;cursor:pointer">立即升级</button></div>',
      textContent: '',
      linkUrl: 'https://cc-models.app/pro',
      width: 320,
      height: 280,
      enabled: 1,
    },
    {
      id: 'seed-ad-corner',
      type: 'corner',
      title: '新用户优惠',
      htmlContent: '<div style="padding:10px;font-size:13px">🎉 新用户首月 5 折</div>',
      textContent: '新用户首月5折',
      linkUrl: 'https://cc-models.app/promo',
      width: 180,
      height: 60,
      enabled: 1,
    },
  ];

  for (const ad of ads) {
    await prisma.ad.upsert({
      where: { id: ad.id },
      update: ad,
      create: ad,
    });
  }
  console.log(`Created ${ads.length} sample ads`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
