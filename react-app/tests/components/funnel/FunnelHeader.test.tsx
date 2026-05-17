/**
 * Tests for src/components/funnel/FunnelHeader.tsx — minimal logo-only
 * funnel header. Just enough to lock in the brand link is the only
 * navigation back to /.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FunnelHeader from '../../../src/components/funnel/FunnelHeader';

void React;

describe('FunnelHeader', () => {
  it('renders a banner with the Libo brand image', () => {
    render(
      <MemoryRouter>
        <FunnelHeader />
      </MemoryRouter>,
    );
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByAltText('Libo')).toBeInTheDocument();
  });

  it('exposes exactly one link, pointing back to "/"', () => {
    const { container } = render(
      <MemoryRouter>
        <FunnelHeader />
      </MemoryRouter>,
    );
    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/');
    expect(links[0].getAttribute('aria-label')).toBe('Libo home');
  });
});
