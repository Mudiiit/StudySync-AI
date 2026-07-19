import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ActivityService } from './activity.service';

@Injectable()
export class ActivityInterceptor implements NestInterceptor {
  constructor(private activityService: ActivityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const { method, url, ip } = req;
    const userAgent = req.headers['user-agent'] || null;

    return next.handle().pipe(
      tap(() => {
        const userId = req.user?.id || null;

        // Dynamic logging of state mutation calls (POST, PATCH, DELETE, PUT)
        if (method !== 'GET' && !url.includes('auth/')) {
          const parts = url.split('/');
          const resourceName = parts[parts.indexOf('v1') + 1] || 'resource';
          const action = `${method}_${resourceName.toUpperCase()}`;

          this.activityService.log(
            userId,
            action,
            resourceName,
            req.params?.id || null,
            ip,
            userAgent,
            { url },
          );
        }
      }),
    );
  }
}
