import { Test, TestingModule } from '@nestjs/testing';
import { ReportsPdfController } from './reports-pdf.controller';

describe('ReportsPdfController', () => {
  let controller: ReportsPdfController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsPdfController],
    }).compile();

    controller = module.get<ReportsPdfController>(ReportsPdfController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
