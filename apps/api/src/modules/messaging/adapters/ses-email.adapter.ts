// Amazon SES email adapter (TDD §6.11, §10.5).
// Real HTTP via SES v2 API signed with AWS SigV4.
// Falls back to MockEmailAdapter when SES_* env is absent.
import { Logger } from '@nestjs/common';
import { createHash, createHmac } from 'crypto';
import type { EmailAdapter, EmailInput, EmailProvider, MessageDeliveryResult } from '@ecommarce/types';

interface SesCfg {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  fromAddress: string;
}

export class SesEmailAdapter implements EmailAdapter {
  public readonly provider: EmailProvider = 'SES';
  private readonly logger = new Logger(SesEmailAdapter.name);

  constructor(private readonly cfg: SesCfg) {}

  private sign(key: Buffer | string, msg: string): Buffer {
    return createHmac('sha256', key).update(msg).digest();
  }

  private sigv4Headers(
    method: string,
    host: string,
    path: string,
    payload: string,
  ): Record<string, string> {
    const region = this.cfg.region;
    const service = 'ses';
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const canonicalHeaders =
      `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-date';
    const payloadHash = createHash('sha256').update(payload).digest('hex');
    const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const kDate = this.sign(`AWS4${this.cfg.secretAccessKey}`, dateStamp);
    const kRegion = this.sign(kDate, region);
    const kService = this.sign(kRegion, service);
    const kSigning = this.sign(kService, 'aws4_request');
    const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    const auth = `AWS4-HMAC-SHA256 Credential=${this.cfg.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      'Content-Type': 'application/json',
      'X-Amz-Date': amzDate,
      Authorization: auth,
    };
  }

  async send(input: EmailInput): Promise<MessageDeliveryResult> {
    const host = `email.${this.cfg.region}.amazonaws.com`;
    const path = '/v2/email/outbound-emails';
    const from = input.from || this.cfg.fromAddress;

    const body = {
      FromEmailAddress: from,
      Destination: { ToAddresses: [input.to] },
      Content: {
        Simple: {
          Subject: { Data: input.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: input.html, Charset: 'UTF-8' },
            ...(input.text ? { Text: { Data: input.text, Charset: 'UTF-8' } } : {}),
          },
        },
      },
      ...(input.attachments.length > 0
        ? {
            Content: {
              Raw: {
                Data: Buffer.from(
                  this.buildRawMime(from, input),
                  'utf8',
                ).toString('base64'),
              },
            },
          }
        : {}),
    };

    const payload = JSON.stringify(body);
    const headers = this.sigv4Headers('POST', host, path, payload);

    const res = await fetch(`https://${host}${path}`, {
      method: 'POST',
      headers,
      body: payload,
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      this.logger.warn(`SES send failed: ${JSON.stringify(json)}`);
      return {
        ok: false,
        providerMessageId: undefined,
        error: JSON.stringify(json),
        raw: json,
      };
    }
    return {
      ok: true,
      providerMessageId: json['MessageId'] ? String(json['MessageId']) : undefined,
      error: undefined,
      raw: json,
    };
  }

  /** Minimal multipart MIME for attachment (base64). */
  private buildRawMime(from: string, input: EmailInput): string {
    const boundary = `----=_Part_${Date.now()}`;
    const parts: string[] = [];
    parts.push(`From: ${from}`);
    parts.push(`To: ${input.to}`);
    parts.push(`Subject: =?UTF-8?B?${Buffer.from(input.subject, 'utf8').toString('base64')}?=`);
    parts.push('MIME-Version: 1.0');
    parts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    parts.push('');
    parts.push(`--${boundary}`);
    parts.push('Content-Type: text/html; charset=UTF-8');
    parts.push('Content-Transfer-Encoding: base64');
    parts.push('');
    parts.push(Buffer.from(input.html, 'utf8').toString('base64'));
    for (const att of input.attachments) {
      parts.push(`--${boundary}`);
      parts.push(`Content-Type: ${att.contentType}; name="${att.filename}"`);
      parts.push('Content-Transfer-Encoding: base64');
      parts.push(`Content-Disposition: attachment; filename="${att.filename}"`);
      parts.push('');
      parts.push(att.contentBase64);
    }
    parts.push(`--${boundary}--`);
    return parts.join('\r\n');
  }
}