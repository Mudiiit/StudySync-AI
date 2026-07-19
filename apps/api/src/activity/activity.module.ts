import { Module, Global } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ActivityInterceptor } from './activity.interceptor';

@Global()
@Module({
  providers: [ActivityService, ActivityInterceptor],
  exports: [ActivityService, ActivityInterceptor],
})
export class ActivityModule {}
