import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import PageNotFound from '../pages/PageNotFound';

describe('PageNotFound', () => {
  it('shows the invalid path and returns to the home route', async () => {
    render(
      <MemoryRouter initialEntries={['/unknown-route']}>
        <Routes>
          <Route path="/unknown-route" element={<PageNotFound />} />
          <Route path="/" element={<p>Home route</p>} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { name: 'Halaman tidak ditemukan' })
    ).toBeInTheDocument();
    expect(screen.getByText('/unknown-route')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Kembali ke beranda' })
    );

    expect(await screen.findByText('Home route')).toBeInTheDocument();
  });
});
