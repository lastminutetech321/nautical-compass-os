import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../../entities/message.entity';
import { MessageStatus, MessageType, MessageDirection } from '../../enums/message.enum';

export interface SendSmsOptions {
  to: string;
  body: string;
  from?: string;
  mediaUrls?: string[];
}

export interface SmsWebhookPayload {
  MessageSid: string;
  From: string;
  To: string;
  Body: string;
  MessageStatus?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly testMode: boolean;
  private readonly testPhoneNumbers: Set<string>;

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly configService: ConfigService,
  ) {
    this.testMode = this.configService.get<string>('NODE_ENV') !== 'production';
    const testNumbers = this.configService.get<string>('TEST_PHONE_NUMBERS', '');
    this.testPhoneNumbers = new Set(testNumbers.split(',').map(n => this.normalizePhoneNumber(n)).filter(Boolean));
  }

  private normalizePhoneNumber(phone: string): string {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) return `+1${cleaned}`;
    if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`;
    if (phone.startsWith('+')) return `+${cleaned}`;
    return cleaned;
  }

  private isTestNumber(phone: string): boolean {
    return this.testPhoneNumbers.has(this.normalizePhoneNumber(phone));
  }

  async sendSms(options: SendSmsOptions): Promise<Message> {
    const { to, body, from } = options;
    const normalizedTo = this.normalizePhoneNumber(to);
    const normalizedFrom = this.normalizePhoneNumber(from || this.configService.get<string>('TWILIO_PHONE_NUMBER', ''));
    const isTest = this.testMode || this.isTestNumber(normalizedTo);

    const message = this.messageRepository.create({
      type: MessageType.SMS,
      direction: MessageDirection.OUTBOUND,
      to: normalizedTo,
      from: normalizedFrom,
      body,
      status: MessageStatus.PENDING,
      metadata: { testMode: isTest }
    });

    if (isTest) {
      message.externalId = `test_${Date.now()}`;
      message.status = MessageStatus.SENT;
      message.metadata = { ...message.metadata, simulatedSend: true };
    } else {
      message.externalId = `prod_${Date.now()}`;
      message.status = MessageStatus.SENT;
    }

    await this.messageRepository.save(message);
    return message;
  }

  async processInboundSms(payload: SmsWebhookPayload): Promise<Message> {
    const { MessageSid, From, To, Body } = payload;
    if (!MessageSid || !From || !To) throw new Error('Invalid webhook payload');

    const existing = await this.messageRepository.findOne({ where: { externalId: MessageSid } });
    if (existing) return existing;

    const message = this.messageRepository.create({
      type: MessageType.SMS,
      direction: MessageDirection.INBOUND,
      from: this.normalizePhoneNumber(From),
      to: this.normalizePhoneNumber(To),
      body: Body || '',
      externalId: MessageSid,
      status: MessageStatus.RECEIVED,
      metadata: { testMode: this.testMode || this.isTestNumber(From) }
    });

    await this.messageRepository.save(message);
    return message;
  }
}
