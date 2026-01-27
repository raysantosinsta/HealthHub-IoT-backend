import { Test, TestingModule } from '@nestjs/testing';
import { PredictionSchedulerService } from './prediction-scheduler.service';

describe('PredictionSchedulerService', () => {
  let service: PredictionSchedulerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PredictionSchedulerService],
    }).compile();

    service = module.get<PredictionSchedulerService>(PredictionSchedulerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
