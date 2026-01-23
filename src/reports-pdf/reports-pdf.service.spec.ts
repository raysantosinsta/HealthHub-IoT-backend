import { Test, TestingModule } from '@nestjs/testing';
import { ReportsPdfService } from './reports-pdf.service';

describe('ReportsPdfService', () => {
  let service: ReportsPdfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsPdfService],
    }).compile();

    service = module.get<ReportsPdfService>(ReportsPdfService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
