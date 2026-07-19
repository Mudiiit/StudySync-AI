import { Injectable } from '@nestjs/common';

@Injectable()
export class TextCleaner {
  cleanText(text: string): string {
    if (!text) return '';
    return text
      .replace(/[\r\n]+/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  detectLanguage(text: string): string {
    if (!text) return 'en';
    const cleanText = text.toLowerCase();

    const spanishWords = [
      ' el ',
      ' la ',
      ' de ',
      ' que ',
      ' en ',
      ' un ',
      ' con ',
      ' para ',
    ];
    const frenchWords = [
      ' le ',
      ' la ',
      ' de ',
      ' que ',
      ' en ',
      ' un ',
      ' et ',
      ' pour ',
    ];
    const germanWords = [
      ' der ',
      ' die ',
      ' das ',
      ' und ',
      ' ist ',
      ' ein ',
      ' mit ',
      ' für ',
    ];

    let esScore = 0;
    let frScore = 0;
    let deScore = 0;

    spanishWords.forEach((word) => {
      if (cleanText.includes(word)) esScore++;
    });
    frenchWords.forEach((word) => {
      if (cleanText.includes(word)) frScore++;
    });
    germanWords.forEach((word) => {
      if (cleanText.includes(word)) deScore++;
    });

    if (esScore > 2 && esScore > frScore && esScore > deScore) return 'es';
    if (frScore > 2 && frScore > esScore && frScore > deScore) return 'fr';
    if (deScore > 2 && deScore > esScore && deScore > frScore) return 'de';

    return 'en';
  }

  extractKeywords(text: string, count = 5): string[] {
    if (!text) return [];

    const words = text
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '')
      .split(/\s+/);

    const stopwords = new Set([
      'the',
      'a',
      'an',
      'and',
      'but',
      'or',
      'for',
      'nor',
      'on',
      'at',
      'to',
      'from',
      'by',
      'with',
      'about',
      'as',
      'in',
      'into',
      'of',
      'de',
      'la',
      'que',
      'en',
      'un',
      'el',
      'der',
      'die',
      'das',
      'und',
      'ist',
      'ein',
      'this',
      'that',
      'these',
      'those',
      'is',
      'am',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
    ]);

    const freq: { [key: string]: number } = {};
    words.forEach((w) => {
      if (w.length > 3 && !stopwords.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
      }
    });

    return Object.keys(freq)
      .sort((a, b) => freq[b] - freq[a])
      .slice(0, count);
  }
}
