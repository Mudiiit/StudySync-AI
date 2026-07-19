import { Injectable } from '@nestjs/common';
import * as pdfParseModule from 'pdf-parse';

@Injectable()
export class PdfParser {
  async parse(
    buffer: Buffer,
  ): Promise<{ text: string; pages: { page: number; text: string }[] }> {
    const PDFParse: any =
      pdfParseModule.PDFParse || (pdfParseModule as any).default?.PDFParse;

    if (!PDFParse) {
      throw new Error('PDFParse constructor not found in pdf-parse module');
    }

    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      const pages = (result.pages || []).map((p: any) => ({
        page: p.num || 1,
        text: p.text || '',
      }));
      return {
        text: result.text || '',
        pages,
      };
    } finally {
      try {
        await parser.destroy();
      } catch (err) {
        // ignore destroy exceptions
      }
    }
  }
}
