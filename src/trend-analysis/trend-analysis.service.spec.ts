import { Test, TestingModule } from '@nestjs/testing';
import { TrendAnalysisService } from './trend-analysis.service';

describe('TrendAnalysisService', () => {
  let service: TrendAnalysisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrendAnalysisService],
    }).compile();

    service = module.get<TrendAnalysisService>(TrendAnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
