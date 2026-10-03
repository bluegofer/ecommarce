// apps/api/src/modules/orders/invoice.service.ts
// Minimal invoice generator. Emits a plain-text invoice and a very small
// PDF (no external deps — hand-rolled PDF with fixed fonts). Step 12 can
// swap this for a richer generator; AC-83 only requires itemized poisha math
// matching order totals, which both formats satisfy.
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  async generateText(orderId: string): Promise<string> {
    const order = await this.loadOrder(orderId);
    const lines: string[] = [];
    lines.push('========================================');
    lines.push('  NoLimitShopping — TAX INVOICE');
    lines.push('========================================');
    lines.push(`Order #: ${order.orderNumber}`);
    lines.push(`Date: ${order.placedAt.toISOString()}`);
    lines.push(`Status: ${order.status}`);
    lines.push('');
    lines.push('Ship To:');
    const addr = order.shippingAddressJson as Record<string, string>;
    lines.push(`  ${addr.recipientName ?? ''}`);
    lines.push(`  ${addr.line1 ?? ''}${addr.line2 ? ', ' + addr.line2 : ''}`);
    lines.push(`  ${addr.area ?? ''}, ${addr.city ?? ''} ${addr.postcode ?? ''}`);
    lines.push(`  Phone: ${order.contactPhone}`);
    lines.push('');
    lines.push('Items:');
    lines.push('----------------------------------------');
    for (const it of order.items) {
      lines.push(
        `  ${it.productTitleEn} x${it.quantity} @ ${(it.unitPricePoisha / 100).toFixed(2)} = ${(it.lineTotalPoisha / 100).toFixed(2)}`,
      );
    }
    lines.push('----------------------------------------');
    lines.push(`  Subtotal:         ৳${(order.subtotalPoisha / 100).toFixed(2)}`);
    if (order.discountPoisha > 0) {
      lines.push(`  Discount:        -৳${(order.discountPoisha / 100).toFixed(2)}`);
    }
    lines.push(`  Delivery Charge:  ৳${(order.deliveryChargePoisha / 100).toFixed(2)}`);
    lines.push(`  TOTAL:            ৳${(order.totalPoisha / 100).toFixed(2)}`);
    lines.push('');
    lines.push('Thank you for shopping with NoLimitShopping.');

    // Sanity check: itemized math must match
    const computedSubtotal = order.items.reduce((s, i) => s + i.lineTotalPoisha, 0);
    if (computedSubtotal !== order.subtotalPoisha) {
      throw new Error(
        `Invoice subtotal mismatch: computed=${computedSubtotal} stored=${order.subtotalPoisha}`,
      );
    }
    const expectedTotal =
      order.subtotalPoisha - order.discountPoisha + order.deliveryChargePoisha;
    if (expectedTotal !== order.totalPoisha) {
      throw new Error(
        `Invoice total mismatch: expected=${expectedTotal} stored=${order.totalPoisha}`,
      );
    }

    return lines.join('\n');
  }

  async generatePdf(orderId: string): Promise<Buffer> {
    // Very small "PDF": 1 page, Helvetica, content stream = the same text lines.
    // Not pretty, but a real PDF that opens in viewers.
    const text = await this.generateText(orderId);
    const lines = text.split('\n').slice(0, 60); // cap to one page

    const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const contentLines: string[] = ['BT', '/F1 10 Tf', '40 780 Td', '12 TL'];
    for (const l of lines) {
      contentLines.push(`(${escape(l)}) Tj`);
      contentLines.push('T*');
    }
    contentLines.push('ET');
    const stream = contentLines.join('\n');

    const objects: string[] = [];
    objects.push('<< /Type /Catalog /Pages 2 0 R >>');
    objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    objects.push(
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    );
    objects.push(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`);
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];
    for (let i = 0; i < objects.length; i += 1) {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xrefStart = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) {
      pdf += `${off.toString().padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
    return Buffer.from(pdf, 'utf8');
  }

  private async loadOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('order not found');
    return order;
  }
}