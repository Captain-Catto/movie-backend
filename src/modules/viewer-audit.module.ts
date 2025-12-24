import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ViewerAuditLog } from "../entities/viewer-audit-log.entity";
import { ViewerReadOnlyInterceptor } from "../interceptors/viewer-read-only.interceptor";

@Module({
  imports: [TypeOrmModule.forFeature([ViewerAuditLog])],
  providers: [ViewerReadOnlyInterceptor],
  exports: [ViewerReadOnlyInterceptor, TypeOrmModule],
})
export class ViewerAuditModule {}
