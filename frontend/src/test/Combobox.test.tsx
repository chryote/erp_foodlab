import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  Combobox,
  type ComboboxOption,
} from '../components/ui/shadcn/combobox';
import {
  CommandDialog,
  CommandInput,
} from '../components/ui/shadcn/command';

const options: ComboboxOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
];

function ComboboxHarness() {
  const [value, setValue] = useState('');

  return (
    <Combobox
      options={options}
      value={value}
      onValueChange={setValue}
      placeholder='Choose a fruit'
      searchPlaceholder='Search fruits'
    />
  );
}

describe('Combobox', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (HTMLElement.prototype as { scrollIntoView?: () => void })
      .scrollIntoView;
  });

  it('filters options and selects a value', async () => {
    render(<ComboboxHarness />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Choose a fruit' }));
    fireEvent.change(screen.getByPlaceholderText('Search fruits'), {
      target: { value: 'Banana' },
    });
    fireEvent.click(await screen.findByRole('option', { name: 'Banana' }));

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveTextContent('Banana');
      expect(screen.getByRole('combobox')).toHaveAttribute(
        'aria-expanded',
        'false'
      );
    });
  });

  it('uses the shared Dialog close button in CommandDialog', () => {
    render(
      <CommandDialog open onOpenChange={vi.fn()}>
        <CommandInput placeholder='Search commands' />
      </CommandDialog>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});
