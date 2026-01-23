import { Test, TestingModule } from '@nestjs/testing';
import { ReportsWeeklyReportService } from './reports-weekly-report.service';

describe('ReportsWeeklyReportService', () => {
  let service: ReportsWeeklyReportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsWeeklyReportService],
    }).compile();

    service = module.get<ReportsWeeklyReportService>(ReportsWeeklyReportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
