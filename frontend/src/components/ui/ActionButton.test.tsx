import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ActionButton } from './ActionButton';

describe('ActionButton', () => {
  it('exposes a disabled reason to assistive technology', () => {
    const html = renderToStaticMarkup(
      <ActionButton
        label="Enviar"
        disabled
        disabledReason="Configura un canal antes de enviar"
      />,
    );

    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('Configura un canal antes de enviar');
  });
});
