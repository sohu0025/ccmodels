import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SystemProviderData {
  name: string;
  icon?: string;
  type?: string;
  website?: string;
  openaiApiBase?: string;
  anthropicApiBase?: string;
  googleApiBase?: string;
  sort?: number;
  isActive?: boolean;
}

export interface AdData {
  type: string;
  title?: string;
  htmlContent?: string;
  textContent?: string;
  linkUrl?: string;
  width?: number;
  height?: number;
  enabled?: boolean;
}

export interface SettingData {
  key: string;
  value: string;
}

@Injectable()
export class AdminService {
  async listProviders() {
    return prisma.systemProvider.findMany({ orderBy: { sort: 'asc' } });
  }

  async getProvider(id: string) {
    return prisma.systemProvider.findUnique({ where: { id } });
  }

  async createProvider(data: SystemProviderData) {
    return prisma.systemProvider.create({ data: { ...data } as any });
  }

  async updateProvider(id: string, data: Partial<SystemProviderData>) {
    const existing = await prisma.systemProvider.findUnique({ where: { id } });
    if (!existing) return null;
    return prisma.systemProvider.update({ where: { id }, data: { ...data } as any });
  }

  async deleteProvider(id: string) {
    const existing = await prisma.systemProvider.findUnique({ where: { id } });
    if (!existing) return false;
    await prisma.systemProvider.delete({ where: { id } });
    return true;
  }

  /** Public: list active system providers */
  async listActiveProviders() {
    return prisma.systemProvider.findMany({
      where: { isActive: true },
      orderBy: { sort: 'asc' },
    });
  }

  /* ---- Ad methods ---- */

  async listAds() {
    return prisma.ad.findMany({ orderBy: [{ type: 'asc' }, { createdAt: 'asc' }] });
  }

  async createAd(data: AdData) {
    return prisma.ad.create({
      data: {
        type: data.type ?? 'popup',
        title: data.title ?? '',
        htmlContent: data.htmlContent ?? '',
        textContent: data.textContent ?? '',
        linkUrl: data.linkUrl ?? '',
        width: data.width ?? 0,
        height: data.height ?? 0,
        enabled: data.enabled ? 1 : 0,
      },
    });
  }

  async updateAd(id: string, data: Partial<AdData>) {
    const existing = await prisma.ad.findUnique({ where: { id } });
    if (!existing) return null;
    return prisma.ad.update({
      where: { id },
      data: {
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.htmlContent !== undefined ? { htmlContent: data.htmlContent } : {}),
        ...(data.textContent !== undefined ? { textContent: data.textContent } : {}),
        ...(data.linkUrl !== undefined ? { linkUrl: data.linkUrl } : {}),
        ...(data.width !== undefined ? { width: data.width } : {}),
        ...(data.height !== undefined ? { height: data.height } : {}),
        ...(data.enabled !== undefined ? { enabled: data.enabled ? 1 : 0 } : {}),
      },
    });
  }

  async deleteAd(id: string) {
    const existing = await prisma.ad.findUnique({ where: { id } });
    if (!existing) return false;
    await prisma.ad.delete({ where: { id } });
    return true;
  }

  /* ---- Device stats methods ---- */

  async registerDevice(deviceId: string): Promise<boolean> {
    const existing = await prisma.deviceStat.findUnique({ where: { deviceId } });
    if (existing) return false; // Already registered
    const now = new Date();
    await prisma.deviceStat.create({
      data: { deviceId, usageCount: 1 },
    });
    await prisma.usageLog.create({ data: { deviceId, createdAt: now } });
    return true;
  }

  async heartbeat(deviceId: string): Promise<void> {
    const now = new Date();
    await prisma.deviceStat.upsert({
      where: { deviceId },
      create: { deviceId, usageCount: 1 },
      update: { usageCount: { increment: 1 }, lastSeen: now },
    });
    await prisma.usageLog.create({ data: { deviceId, createdAt: now } });
  }

  async getDashboardStats(startDate?: string, endDate?: string) {
    const dateFilter = startDate || endDate
      ? {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        }
      : undefined;

    const [totalUsers, totalUsage, topUsers] = await Promise.all([
      startDate || endDate
        ? prisma.deviceStat.count({ where: { firstSeen: dateFilter as any } })
        : prisma.deviceStat.count(),
      startDate || endDate
        ? prisma.usageLog.count({ where: { createdAt: dateFilter as any } })
        : prisma.deviceStat.aggregate({ _sum: { usageCount: true } }).then(r => r._sum.usageCount ?? 0),
      prisma.deviceStat.findMany({
        orderBy: { usageCount: 'desc' },
        take: 5,
        select: { deviceId: true, usageCount: true, lastSeen: true },
      }),
    ]);
    return {
      totalUsers,
      totalUsage,
      topUsers: topUsers.map((u, i) => ({
        rank: i + 1,
        deviceId: u.deviceId.slice(0, 8) + '...',
        usageCount: u.usageCount,
        lastSeen: u.lastSeen,
      })),
    };
  }

  /* ---- Settings methods ---- */

  async getSettings(): Promise<Record<string, string>> {
    const rows = await prisma.appSetting.findMany();
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return map;
  }

  async getSetting(key: string): Promise<string | null> {
    const row = await prisma.appSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  }

  async upsertSetting(key: string, value: string): Promise<{ key: string; value: string }> {
    return prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  /* ---- Build installer (GitHub Actions) ---- */

  async triggerGitHubBuild(): Promise<{
    success: boolean;
    message: string;
    runUrl?: string;
  }> {
    const settings = await this.getSettings();
    const serverUrl = settings.serverUrl || 'http://localhost:3000';
    const githubToken = settings.githubToken;
    const githubRepo = settings.githubRepo;

    if (!githubToken) {
      return { success: false, message: 'GitHub Token 未配置，请在系统设置中添加' };
    }
    if (!githubRepo) {
      return { success: false, message: 'GitHub 仓库未配置（格式：username/repo）' };
    }

    try {
      const res = await fetch(
        `https://api.github.com/repos/${githubRepo}/dispatches`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'cc-models-admin',
          },
          body: JSON.stringify({
            event_type: 'build-installer',
            client_payload: { serverUrl, websiteUrl: settings.websiteUrl || '', latestVersion: settings.latestVersion || '', downloadUrl: settings.downloadUrl || '' },
          }),
        },
      );

      if (!res.ok) {
        const err = await res.text();
        if (res.status === 403) {
          return {
            success: false,
            message: `GitHub Token 权限不足。请在 https://github.com/settings/tokens 创建 Token，权限需要勾选 "Actions: Read and Write"（或经典 Token 勾选 repo/public_repo）`,
          };
        }
        return { success: false, message: `GitHub API 错误 (${res.status}): ${err}` };
      }

      return {
        success: true,
        message: '已触发构建，请前往 GitHub Actions 查看进度',
        runUrl: `https://github.com/${githubRepo}/actions/workflows/build-installer.yml`,
      };
    } catch (err: any) {
      return { success: false, message: `请求失败: ${err.message}` };
    }
  }

  async getBuildStatus(): Promise<{
    running: boolean;
    runs: Array<{
      id: number;
      status: string;
      conclusion: string | null;
      htmlUrl: string;
      createdAt: string;
      platform: string;
    }>;
    artifacts: Array<{
      name: string;
      downloadUrl: string;
      size: number;
    }>;
  }> {
    const settings = await this.getSettings();
    const githubToken = settings.githubToken;
    const githubRepo = settings.githubRepo;

    if (!githubToken || !githubRepo) {
      return { running: false, runs: [], artifacts: [] };
    }

    const headers = {
      Authorization: `Bearer ${githubToken}`,
      'User-Agent': 'cc-models-admin',
    };

    try {
      // Query latest 5 workflow runs
      const runsRes = await fetch(
        `https://api.github.com/repos/${githubRepo}/actions/workflows/build-installer.yml/runs?per_page=5`,
        { headers },
      );
      const runsData = await runsRes.json() as any;
      const runs = (runsData.workflow_runs || []).map((run: any) => ({
        id: run.id,
        status: run.status,
        conclusion: run.conclusion,
        htmlUrl: run.html_url,
        createdAt: run.created_at,
        platform: (run.display_title || run.name || '').includes('macos')
          ? 'macOS' : (run.display_title || run.name || '').includes('ubuntu')
          ? 'Linux' : 'Windows',
      }));

      const running = runs.some((r: any) => r.status === 'in_progress' || r.status === 'queued' || r.status === 'pending');

      // Get artifacts from the latest completed run
      let artifacts: Array<{ name: string; downloadUrl: string; size: number }> = [];
      const latestRun = runs.find((r: any) => r.conclusion === 'success');
      if (latestRun) {
        const artRes = await fetch(
          `https://api.github.com/repos/${githubRepo}/actions/runs/${latestRun.id}/artifacts`,
          { headers },
        );
        const artData = await artRes.json() as any;
        artifacts = (artData.artifacts || []).map((a: any) => ({
          name: a.name,
          downloadUrl: a.archive_download_url,
          size: a.size_in_bytes,
        }));
      }

      return { running, runs, artifacts };
    } catch {
      return { running: false, runs: [], artifacts: [] };
    }
  }
}
