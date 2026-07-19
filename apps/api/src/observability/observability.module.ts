import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { HealthController } from './health.controller';
import { StructuredLogger } from './structured.logger';
import { TraceMiddleware } from './trace.middleware';

@Module({
  controllers: [HealthController],
  providers: [StructuredLogger],
  exports: [StructuredLogger],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TraceMiddleware).forRoutes('*');
  }
}
