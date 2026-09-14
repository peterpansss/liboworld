/**
 * Tests for src/pages/Terms.tsx — public legal page.
 * Mirrors Privacy.test.tsx — static text + document.title side effect.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

void React;

vi.mock('../../src/components/SiteNav', () => ({
  default: () => <nav data-testid="site-nav" />,
}));
vi.mock('../../src/components/SiteFooter', () => ({
  default: () => <footer data-testid="site-footer" />,
}));

// GIVEAWAYS_ENABLED gates the "Points Packs" section (#points-packs, formerly
// #s8) out of the Terms for launch. Mocked with a getter so each test can pick
// the gate state instead of depending on the current build flag.
let giveawaysEnabled = false;
vi.mock('../../src/config/featureFlags', () => ({
  get GIVEAWAYS_ENABLED() {
    return giveawaysEnabled;
  },
}));

import Terms from '../../src/pages/Terms';

beforeEach(() => {
  giveawaysEnabled = false;
});

const tocHrefs = () =>
  Array.from(document.querySelectorAll<HTMLAnchorElement>('.legal-toc a')).map((a) =>
    a.getAttribute('href'),
  );
const sectionNumbers = () =>
  Array.from(document.querySelectorAll('.legal-section-num')).map((el) => el.textContent);
const expectedNumbers = (count: number) =>
  Array.from({ length: count }, (_, i) => String(i + 1).padStart(2, '0'));

function renderPage() {
  return render(
    <MemoryRouter>
      <Terms />
    </MemoryRouter>,
  );
}

describe('Terms', () => {
  it('renders the H1 and a sample of section headings', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: /Terms & Conditions/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Acceptance of Terms/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Subscription Plans/ })).toBeInTheDocument();
    // The trial entitlement was deleted on 2026-08-28: no introductory offer
    // exists on either ASC product and TIER_TRIAL_DAYS is 0, so promising one
    // in the Terms was a contractual claim we could not honour. Guard it.
    expect(document.body.textContent).not.toMatch(/free trial of Libo|7-day free trial/i);
    expect(screen.getByRole('heading', { level: 2, name: /Health & Fitness Disclaimer/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Governing Law/ })).toBeInTheDocument();
  });

  it('renders SiteNav and SiteFooter wrappers and Privacy link', () => {
    renderPage();
    expect(screen.getByTestId('site-nav')).toBeInTheDocument();
    expect(screen.getByTestId('site-footer')).toBeInTheDocument();
    const privacy = screen.getByRole('link', { name: /Privacy Policy/ });
    expect(privacy).toHaveAttribute('href', '/privacy');
  });

  it('renders 19 TOC links, each resolving to a section, numbered 01–19 with giveaways gated off', () => {
    renderPage();
    const hrefs = tocHrefs();
    // s8 (Points Packs) is gated off; the remaining sections keep their ids.
    expect(hrefs).toEqual([
      '#s1', '#s2', '#s3', '#s4', '#s5', '#s6', '#s7',
      '#s9', '#s10', '#s11', '#s12', '#s13', '#s14', '#s15', '#s16', '#s17', '#s18',
      '#early-access', '#challenge-rules',
    ]);
    for (const href of hrefs) {
      expect(document.getElementById(href!.slice(1)), `expected section for ${href}`).not.toBeNull();
    }
    expect(document.getElementById('points-packs')).toBeNull();
    expect(screen.queryByRole('heading', { name: /Points Packs/i })).not.toBeInTheDocument();
    // Visible numbering renumbers around the gap rather than skipping 08.
    expect(sectionNumbers()).toEqual(expectedNumbers(19));
  });

  it('adds the Points Packs section to the TOC and numbering when giveaways are enabled', () => {
    giveawaysEnabled = true;
    renderPage();
    const hrefs = tocHrefs();
    expect(hrefs).toHaveLength(20);
    expect(hrefs[7]).toBe('#points-packs');
    for (const href of hrefs) {
      expect(document.getElementById(href!.slice(1)), `expected section for ${href}`).not.toBeNull();
    }
    expect(sectionNumbers()).toEqual(expectedNumbers(20));
  });

  it('exposes the support email', () => {
    renderPage();
    const links = screen.getAllByRole('link', { name: /hello@liboworld\.com/ });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute('href', 'mailto:hello@liboworld.com');
  });

  it('sets the document title on mount and restores it on unmount', () => {
    const { unmount } = renderPage();
    expect(document.title).toBe('Terms & Conditions | Libo');
    unmount();
    expect(document.title).toBe('Libo');
  });
});
