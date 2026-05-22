import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AdminService, SystemProviderData, AdData, SettingData } from './admin.service';

@Controller()
export class AdminController {
  constructor(private adminService: AdminService) {}

  /** Public: list active system providers (no auth required) */
  @Get('api/system-providers')
  async listActive() {
    return this.adminService.listActiveProviders();
  }

  /* ---- Admin-only endpoints below ---- */

  @Get('api/admin/system-providers')
  @UseGuards(AdminGuard)
  async list() {
    return this.adminService.listProviders();
  }

  @Get('api/admin/system-providers/:id')
  @UseGuards(AdminGuard)
  async getById(@Param('id') id: string) {
    const p = await this.adminService.getProvider(id);
    if (!p) throw new HttpException('Not found', HttpStatus.NOT_FOUND);
    return p;
  }

  @Post('api/admin/system-providers')
  @UseGuards(AdminGuard)
  async create(@Body() body: SystemProviderData) {
    if (!body.name) throw new HttpException('Name is required', HttpStatus.BAD_REQUEST);
    return this.adminService.createProvider(body);
  }

  @Put('api/admin/system-providers/:id')
  @UseGuards(AdminGuard)
  async update(@Param('id') id: string, @Body() body: Partial<SystemProviderData>) {
    const p = await this.adminService.updateProvider(id, body);
    if (!p) throw new HttpException('Not found', HttpStatus.NOT_FOUND);
    return p;
  }

  @Delete('api/admin/system-providers/:id')
  @UseGuards(AdminGuard)
  async remove(@Param('id') id: string) {
    const ok = await this.adminService.deleteProvider(id);
    if (!ok) throw new HttpException('Not found', HttpStatus.NOT_FOUND);
    return { success: true };
  }

  /* ---- Ad management endpoints ---- */

  @Get('api/ad/list')
  async listAds() {
    return this.adminService.listAds();
  }

  @Post('api/ad/create')
  @UseGuards(AdminGuard)
  async createAd(@Body() body: AdData) {
    return this.adminService.createAd(body);
  }

  @Put('api/ad/update/:id')
  @UseGuards(AdminGuard)
  async updateAd(@Param('id') id: string, @Body() body: Partial<AdData>) {
    const ad = await this.adminService.updateAd(id, body);
    if (!ad) throw new HttpException('Not found', HttpStatus.NOT_FOUND);
    return ad;
  }

  @Delete('api/ad/delete/:id')
  @UseGuards(AdminGuard)
  async removeAd(@Param('id') id: string) {
    const ok = await this.adminService.deleteAd(id);
    if (!ok) throw new HttpException('Not found', HttpStatus.NOT_FOUND);
    return { success: true };
  }

  /* ---- Device stats endpoints ---- */

  @Post('api/stats/register')
  async registerDevice(@Body('deviceId') deviceId: string) {
    if (!deviceId) throw new HttpException('deviceId required', HttpStatus.BAD_REQUEST);
    const isNew = await this.adminService.registerDevice(deviceId);
    return { success: true, isNew };
  }

  @Post('api/stats/heartbeat')
  async heartbeat(@Body('deviceId') deviceId: string) {
    if (!deviceId) throw new HttpException('deviceId required', HttpStatus.BAD_REQUEST);
    await this.adminService.heartbeat(deviceId);
    return { success: true };
  }

  @Get('api/admin/stats/dashboard')
  @UseGuards(AdminGuard)
  async dashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getDashboardStats(startDate, endDate);
  }

  /* ---- Settings endpoints ---- */

  @Get('api/admin/settings')
  @UseGuards(AdminGuard)
  async getSettings() {
    return this.adminService.getSettings();
  }

  @Get('api/admin/settings/:key')
  @UseGuards(AdminGuard)
  async getSetting(@Param('key') key: string) {
    const value = await this.adminService.getSetting(key);
    if (value === null) throw new HttpException('Not found', HttpStatus.NOT_FOUND);
    return { key, value };
  }

  @Put('api/admin/settings/:key')
  @UseGuards(AdminGuard)
  async updateSetting(@Param('key') key: string, @Body() body: SettingData) {
    return this.adminService.upsertSetting(key, body.value);
  }

  /* ---- Build installer (GitHub Actions) ---- */

  @Post('api/admin/build-installer')
  @UseGuards(AdminGuard)
  async triggerBuild() {
    return this.adminService.triggerGitHubBuild();
  }

  @Get('api/admin/build-installer/status')
  @UseGuards(AdminGuard)
  async buildStatus() {
    return this.adminService.getBuildStatus();
  }
}
