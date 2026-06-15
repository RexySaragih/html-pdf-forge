/**
 * Rendering HTML templates.
 *
 * Behavioral tests for the Mustache-backed template flow: substitution,
 * loops, async data, and surfacing of syntax errors.
 */

import { describe, it, expect } from 'vitest';
import { createTemplate, TemplateRenderError } from '../src';
import { isPdfBuffer, readMetadata } from './helpers/pdf-assertions';

describe('Rendering HTML templates', () => {
  describe('when given simple field substitutions', () => {
    it('replaces tokens with their values in the rendered HTML', () => {
      const tmpl = createTemplate('<h1>Invoice #{{number}}</h1><p>For {{customer}}</p>');

      const html = tmpl.toHtml({ number: 42, customer: 'Acme Corp' });

      expect(html).toContain('Invoice #42');
      expect(html).toContain('Acme Corp');
    });
  });

  describe('when given a list with iteration', () => {
    it('expands the loop into one fragment per item', () => {
      const tmpl = createTemplate('<ul>{{#items}}<li>{{name}}: {{amount}}</li>{{/items}}</ul>');

      const html = tmpl.toHtml({
        items: [
          { name: 'Consulting', amount: '$500' },
          { name: 'Design', amount: '$300' },
        ],
      });

      expect(html).toContain('<li>Consulting: $500</li>');
      expect(html).toContain('<li>Design: $300</li>');
    });
  });

  describe('when render() is called with substituted data', () => {
    it('produces a valid PDF inheriting the template options', async () => {
      const tmpl = createTemplate('<h1>{{title}}</h1>', {
        metadata: { author: 'Template Author' },
      });

      const result = await tmpl.render({ title: 'Hello' });
      const buffer = await result.toBuffer();

      expect(isPdfBuffer(buffer)).toBe(true);
      const meta = await readMetadata(buffer);
      expect(meta.author).toBe('Template Author');
    });
  });

  describe('when render() receives a Promise of data', () => {
    it('awaits the data before rendering', async () => {
      const tmpl = createTemplate('<p>{{message}}</p>');

      const result = await tmpl.render(Promise.resolve({ message: 'async data' }));

      expect(isPdfBuffer(await result.toBuffer())).toBe(true);
    });
  });

  describe('when the template references a missing key', () => {
    it('renders an empty string for that token (Mustache default)', () => {
      const tmpl = createTemplate('<p>Hello, {{name}}!</p>');

      const html = tmpl.toHtml({});

      expect(html).toBe('<p>Hello, !</p>');
    });
  });

  describe('when toHtml receives data with HTML-escapable characters', () => {
    it('escapes them by default to prevent injection', () => {
      const tmpl = createTemplate('<p>{{value}}</p>');

      const html = tmpl.toHtml({ value: '<script>alert(1)</script>' });

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('when the template syntax is malformed', () => {
    it('throws a TemplateRenderError surfacing the failure', () => {
      // Unclosed section
      expect(() => createTemplate('<p>{{#items}}</p>')).toThrow(TemplateRenderError);
    });
  });
});
