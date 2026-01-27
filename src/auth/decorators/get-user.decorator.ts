import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from 'generated/prisma/browser';

export const GetUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (data) {
      return user[data];
    }
    return user;
  },
);