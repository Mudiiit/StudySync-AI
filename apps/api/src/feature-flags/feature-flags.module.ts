import { Module, Global } from '@nestjs/common';
import { FeatureFlagService } from './feature-flags.service';
import { FeatureFlagsController } from './feature-flags.controller';

@Global()
@Module({
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagService],
  exports: [FeatureFlagService],
})
export class FeatureFlagsModule {}
