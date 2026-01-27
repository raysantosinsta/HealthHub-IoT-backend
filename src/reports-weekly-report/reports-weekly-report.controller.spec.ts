import { Test, TestingModule } from '@nestjs/testing';
import { ReportsWeeklyReportController } from './reports-weekly-report.controller';

describe('ReportsWeeklyReportController', () => {
  let controller: ReportsWeeklyReportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsWeeklyReportController],
    }).compile();

    controller = module.get<ReportsWeeklyReportController>(ReportsWeeklyReportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
