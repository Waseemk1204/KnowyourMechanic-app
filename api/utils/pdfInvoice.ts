import PDFDocument from 'pdfkit';

export interface InvoiceData {
    invoiceNumber: string;
    date: string;
    customerPhone: string;
    garageName: string;
    serviceDescription: string;
    amount: number;
    platformFee: number;
    garageEarnings: number;
    paymentMethod: 'cash' | 'razorpay';
    businessName?: string;
}

/**
 * Generate a professional PDF invoice and return it as a Buffer.
 */
export function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                info: {
                    Title: `Invoice ${data.invoiceNumber}`,
                    Author: data.businessName || 'KnowyourMechanic',
                },
            });

            const chunks: Buffer[] = [];
            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const brandColor = '#1D4ED8'; // blue-700
            const textDark = '#1E293B';   // slate-800
            const textMuted = '#64748B';  // slate-500
            const lineColor = '#E2E8F0';  // slate-200
            const accentBg = '#EFF6FF';   // blue-50
            const pageWidth = doc.page.width - 100; // 50 margin each side

            // ─── HEADER ─────────────────────────────────────────
            // Brand barzl
            doc.rect(0, 0, doc.page.width, 4).fill(brandColor);

            // Business name
            doc.fontSize(22).fillColor(brandColor).font('Helvetica-Bold')
                .text(data.businessName || 'KnowyourMechanic', 50, 30);

            doc.fontSize(9).fillColor(textMuted).font('Helvetica')
                .text('Verified Auto Services', 50, 56);

            // Invoice title & number (right-aligned)
            doc.fontSize(28).fillColor(textDark).font('Helvetica-Bold')
                .text('INVOICE', 350, 30, { align: 'right', width: pageWidth - 300 });

            doc.fontSize(10).fillColor(textMuted).font('Helvetica')
                .text(`#${data.invoiceNumber}`, 350, 64, { align: 'right', width: pageWidth - 300 });

            // Divider
            doc.moveTo(50, 85).lineTo(50 + pageWidth, 85).strokeColor(lineColor).lineWidth(1).stroke();

            // ─── INFO SECTION ────────────────────────────────────
            const infoY = 100;

            // Left: From (Garage)
            doc.fontSize(8).fillColor(brandColor).font('Helvetica-Bold')
                .text('FROM', 50, infoY);
            doc.fontSize(11).fillColor(textDark).font('Helvetica-Bold')
                .text(data.garageName, 50, infoY + 14);
            doc.fontSize(9).fillColor(textMuted).font('Helvetica')
                .text('Verified on KnowyourMechanic', 50, infoY + 30);

            // Right: Bill To (Customer)
            doc.fontSize(8).fillColor(brandColor).font('Helvetica-Bold')
                .text('BILL TO', 350, infoY);
            doc.fontSize(11).fillColor(textDark).font('Helvetica-Bold')
                .text(`Customer`, 350, infoY + 14);
            doc.fontSize(9).fillColor(textMuted).font('Helvetica')
                .text(data.customerPhone, 350, infoY + 30);

            // Date & Payment Method
            const metaY = infoY + 55;
            doc.fontSize(8).fillColor(brandColor).font('Helvetica-Bold')
                .text('DATE', 50, metaY);
            doc.fontSize(10).fillColor(textDark).font('Helvetica')
                .text(data.date, 50, metaY + 14);

            doc.fontSize(8).fillColor(brandColor).font('Helvetica-Bold')
                .text('PAYMENT METHOD', 350, metaY);
            doc.fontSize(10).fillColor(textDark).font('Helvetica')
                .text(data.paymentMethod === 'razorpay' ? 'Online (Razorpay)' : 'Cash', 350, metaY + 14);

            // ─── LINE ITEMS TABLE ────────────────────────────────
            const tableTop = metaY + 50;

            // Table header background
            doc.rect(50, tableTop, pageWidth, 28).fill(brandColor);

            // Table header text
            doc.fontSize(9).fillColor('#FFFFFF').font('Helvetica-Bold');
            doc.text('DESCRIPTION', 62, tableTop + 9, { width: 280 });
            doc.text('QTY', 350, tableTop + 9, { width: 50, align: 'center' });
            doc.text('RATE', 400, tableTop + 9, { width: 70, align: 'right' });
            doc.text('AMOUNT', 470, tableTop + 9, { width: 75, align: 'right' });

            // Service row
            const rowY = tableTop + 28;
            doc.rect(50, rowY, pageWidth, 36).fill('#FFFFFF');
            doc.moveTo(50, rowY + 36).lineTo(50 + pageWidth, rowY + 36).strokeColor(lineColor).stroke();

            doc.fontSize(10).fillColor(textDark).font('Helvetica');
            doc.text(data.serviceDescription, 62, rowY + 12, { width: 280 });
            doc.text('1', 350, rowY + 12, { width: 50, align: 'center' });
            doc.text(`Rs.${data.amount.toFixed(2)}`, 400, rowY + 12, { width: 70, align: 'right' });
            doc.text(`Rs.${data.amount.toFixed(2)}`, 470, rowY + 12, { width: 75, align: 'right' });

            // Platform fee row
            const feeRowY = rowY + 36;
            doc.rect(50, feeRowY, pageWidth, 36).fill(accentBg);
            doc.moveTo(50, feeRowY + 36).lineTo(50 + pageWidth, feeRowY + 36).strokeColor(lineColor).stroke();

            doc.fontSize(10).fillColor(textMuted).font('Helvetica');
            doc.text('Platform Fee', 62, feeRowY + 8, { width: 280 });
            doc.fontSize(7).fillColor(textMuted)
                .text('Verified records • Dispute protection • Digital invoicing', 62, feeRowY + 22, { width: 280 });
            doc.fontSize(10).fillColor(textMuted).font('Helvetica');
            doc.text('1', 350, feeRowY + 12, { width: 50, align: 'center' });
            doc.text(`Rs.${data.platformFee.toFixed(2)}`, 400, feeRowY + 12, { width: 70, align: 'right' });
            doc.text(`Rs.${data.platformFee.toFixed(2)}`, 470, feeRowY + 12, { width: 75, align: 'right' });

            // ─── TOTALS ──────────────────────────────────────────
            const totalsY = feeRowY + 52;

            // Subtotal
            doc.fontSize(9).fillColor(textMuted).font('Helvetica')
                .text('Subtotal', 380, totalsY, { width: 90, align: 'right' });
            doc.fontSize(10).fillColor(textDark).font('Helvetica')
                .text(`Rs.${data.amount.toFixed(2)}`, 470, totalsY, { width: 75, align: 'right' });

            // Platform Fee
            doc.fontSize(9).fillColor(textMuted).font('Helvetica')
                .text('Platform Fee', 380, totalsY + 20, { width: 90, align: 'right' });
            doc.fontSize(10).fillColor(textDark).font('Helvetica')
                .text(`Rs.${data.platformFee.toFixed(2)}`, 470, totalsY + 20, { width: 75, align: 'right' });

            // Divider before total
            doc.moveTo(380, totalsY + 40).lineTo(545, totalsY + 40).strokeColor(brandColor).lineWidth(2).stroke();

            // Grand Total
            const totalAmount = data.amount + data.platformFee;
            doc.fontSize(12).fillColor(brandColor).font('Helvetica-Bold')
                .text('TOTAL', 380, totalsY + 48, { width: 90, align: 'right' });
            doc.fontSize(14).fillColor(brandColor).font('Helvetica-Bold')
                .text(`Rs.${totalAmount.toFixed(2)}`, 470, totalsY + 46, { width: 75, align: 'right' });

            // ─── BENEFITS BANNER ─────────────────────────────────
            const bannerY = totalsY + 80;
            const bannerHeight = 80;

            doc.roundedRect(50, bannerY, pageWidth, bannerHeight, 8).fill(accentBg);

            doc.fontSize(9).fillColor(brandColor).font('Helvetica-Bold')
                .text('What your Rs.1.90 platform fee covers:', 65, bannerY + 10, { width: pageWidth - 30 });

            doc.fontSize(8).fillColor(textMuted).font('Helvetica');
            const benefits = [
                '- Service records stored permanently, accessible anytime by logging in with your phone number',
                '- Raise issues or report scams/fraud directly through the app',
                '- Access dynamic service portfolios of every listed garage',
                '- Authenticated reviews from verified, genuine customers',
            ];
            doc.text(benefits.join('\n'), 65, bannerY + 25, {
                width: pageWidth - 30,
                lineGap: 2,
            });

            // ─── FOOTER (positioned right after content) ─────────
            const footerY = bannerY + bannerHeight + 30;

            doc.moveTo(50, footerY).lineTo(50 + pageWidth, footerY).strokeColor(lineColor).lineWidth(0.5).stroke();

            doc.fontSize(8).fillColor(textMuted).font('Helvetica')
                .text(
                    'This is a computer-generated invoice. No signature required.',
                    50, footerY + 10,
                    { width: pageWidth, align: 'center' }
                );

            doc.fontSize(8).fillColor(brandColor).font('Helvetica-Bold')
                .text(
                    `${data.businessName || 'KnowyourMechanic'} | knowyourmechanic.com`,
                    50, footerY + 24,
                    { width: pageWidth, align: 'center' }
                );

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Generate a unique invoice number based on timestamp + random suffix
 */
export function generateInvoiceNumber(): string {
    const now = new Date();
    const y = now.getFullYear().toString().slice(-2);
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `KYM-${y}${m}${d}-${rand}`;
}
