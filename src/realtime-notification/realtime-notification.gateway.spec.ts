import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeNotificationGateway } from './realtime-notification.gateway';

describe('RealtimeNotificationGateway', () => {
  let gateway: RealtimeNotificationGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RealtimeNotificationGateway],
    }).compile();

    gateway = module.get<RealtimeNotificationGateway>(RealtimeNotificationGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
