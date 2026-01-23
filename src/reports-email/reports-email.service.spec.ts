import { Test, TestingModule } from '@nestjs/testing';
import { ReportsEmailService } from './reports-email.service';

describe('ReportsEmailService', () => {
  let service: ReportsEmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsEmailService],
    }).compile();

    service = module.get<ReportsEmailService>(ReportsEmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
