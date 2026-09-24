import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SmsService } from './sms.service';
import { Message } from '../../entities/message.entity';
import { MessageStatus, MessageDirection } from '../../enums/message.enum';

describe('SmsService', () => {
  let service: SmsService;
  let messageRepository: any;

  beforeEach(async () => {
    messageRepository = {
      create: jest.fn(data => ({ ...data, id: 'msg-123' })),
      save: jest.fn(msg => Promise.resolve(msg)),
      findOne: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        { provide: getRepositoryToken(Message), useValue: messageRepository },
        { provide: ConfigService, useValue: { get: jest.fn((k, d) => ({ NODE_ENV: 'test', TEST_PHONE_NUMBERS: '+15551234567', TWILIO_PHONE_NUMBER: '+15559876543' }[k] || d)) } }
      ]
    }).compile();

    service = module.get<SmsService>(SmsService);
  });

  it('should send SMS in test mode', async () => {
    const result = await service.sendSms({ to: '+15551234567', body: 'Test' });
    expect(result.status).toBe(MessageStatus.SENT);
    expect(result.metadata.testMode).toBe(true);
  });

  it('should process inbound SMS', async () => {
    messageRepository.findOne.mockResolvedValue(null);
    const result = await service.processInboundSms({ MessageSid: 'SM123', From: '+15551111111', To: '+15552222222', Body: 'Hello' });
    expect(result.direction).toBe(MessageDirection.INBOUND);
    expect(result.status).toBe(MessageStatus.RECEIVED);
  });

  it('should reject duplicate inbound SMS', async () => {
    const existing = { id: 'msg-existing', externalId: 'SM123' };
    messageRepository.findOne.mockResolvedValue(existing);
    const result = await service.processInboundSms({ MessageSid: 'SM123', From: '+15551111111', To: '+15552222222', Body: 'Dup' });
    expect(result).toBe(existing);
  });
});
