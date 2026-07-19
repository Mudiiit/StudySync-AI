import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { FeatureFlagService } from './feature-flags.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private featureFlagService: FeatureFlagService) {}

  @Get()
  async listFlags() {
    return this.featureFlagService.listFlags();
  }

  @Get('check/:key')
  async checkFlag(@Param('key') key: string) {
    const isEnabled = await this.featureFlagService.isEnabled(key);
    return { key, isEnabled };
  }

  @Post('toggle')
  @UseGuards(JwtAuthGuard) // Toggle restricted to authenticated calls
  async toggleFlag(
    @Body('key') key: string,
    @Body('isEnabled') isEnabled: boolean,
  ) {
    return this.featureFlagService.toggleFlag(key, isEnabled);
  }
}
