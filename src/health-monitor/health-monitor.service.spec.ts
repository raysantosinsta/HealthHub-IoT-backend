import { Test, TestingModule } from '@nestjs/testing';
import { HealthMonitorService } from './health-monitor.service';

describe('HealthMonitorService', () => {
  let service: HealthMonitorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthMonitorService],
    }).compile();

    service = module.get<HealthMonitorService>(HealthMonitorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
