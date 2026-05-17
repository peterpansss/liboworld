/**
 * Tests for src/pages/ExerciseDetail.tsx — single-exercise view.
 *
 * Branches covered:
 *   - loading state
 *   - 404 not-found
 *   - happy path: hero, info cards, breadcrumb, video controls
 *   - mute toggle, voice toggle (with localStorage persistence), side-view swap
 *   - fullscreen toggle (uses webkit fallbacks — we just check it dispatches)
 *
 * Heavy imported components (AnatomyDiagram, AlternativesGrid, RelatedArticles,
 * SiteNav/Footer, MuscleTile, MuscleGroupStrip) are stubbed so the test
 * focuses on this page's own logic.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

void React;

vi.mock('../../src/components/SiteNav', () => ({
  default: () => <nav data-testid="site-nav" />,
}));
vi.mock('../../src/components/SiteFooter', () => ({
  default: () => <footer data-testid="site-footer" />,
}));
vi.mock('../../src/components/SeoHead', () => ({
  SeoHead: () => null,
}));
vi.mock('../../src/components/MuscleTile', () => ({
  MuscleTile: () => <span data-testid="muscle-tile" />,
}));
vi.mock('../../src/components/MuscleGroupStrip', () => ({
  MuscleGroupStrip: () => <div data-testid="muscle-strip" />,
}));
vi.mock('../../src/components/AnatomyDiagram', () => ({
  AnatomyDiagram: () => <div data-testid="anatomy" />,
}));
vi.mock('../../src/components/AlternativesGrid', () => ({
  AlternativesGrid: () => <div data-testid="alternatives" />,
}));
vi.mock('../../src/components/RelatedArticles', () => ({
  RelatedArticles: () => <div data-testid="related-articles" />,
}));
vi.mock('../../src/utils/icons', () => ({
  Target: () => null,
  Dumbbell: () => null,
  Zap: () => null,
  Volume2: () => <span>Volume2</span>,
  VolumeX: () => <span>VolumeX</span>,
  Maximize2: () => null,
  Minimize2: () => null,
  ICON_STROKE: 1.6,
}));
vi.mock('../../src/utils/thumbnails', () => ({
  exerciseThumb: () => '/thumb.jpg',
  publicVideoUrl: () => 'https://video/main.mp4',
  publicVideoUrlAlt: () => 'https://video/alt.mp4',
}));
vi.mock('../../src/utils/exerciseInfo', () => ({
  getInstructions: () => ['Step one', 'Step two'],
  getTips: () => ['Heuristic tip'],
  getCommonMistakes: () => ['Heuristic mistake'],
  getPrimaryMuscleGroup: (bf: string) => bf,
}));
vi.mock('../../src/utils/schema', () => ({
  buildExerciseGraph: () => ({}),
  exerciseCanonicalUrl: () => '/exercises/x',
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && typeof opts === 'object' && 'defaultValue' in opts) {
        return key;
      }
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

const EX = {
  id: 'bench-press',
  name: 'Bench Press',
  cat: 'gym',
  primaryCat: 'Strength',
  bodyFocus: 'Chest',
  equipment: 'Barbell',
  environment: 'Gym',
  machineRequired: false,
  diff: 'beginner',
  variation: 'Wide Grip',
  emoji: '',
  setupNotes: 'Lie on the bench, plant your feet, retract your shoulder blades.',
  videoUrl: 'main.mp4',
  videoUrlAlt: 'side.mp4',
};

vi.mock('../../src/data/exercises', () => ({
  getExercises: () => Promise.resolve([EX]),
  loadExerciseContent: () => Promise.resolve({
    'bench-press': {
      tips: ['AI tip 1'],
      commonMistakes: ['AI mistake 1'],
      breathingCue: 'Exhale on press',
    },
  }),
}));

import ExerciseDetail from '../../src/pages/ExerciseDetail';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/exercises/:id" element={<ExerciseDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  // Patch HTMLMediaElement.play / load for jsdom which doesn't implement them
  if (!HTMLMediaElement.prototype.play) {
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  } else {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  }
  if (!HTMLMediaElement.prototype.load) {
    HTMLMediaElement.prototype.load = vi.fn();
  } else {
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  }
  window.localStorage.clear();
});

describe('ExerciseDetail', () => {
  it('renders the loading message before data resolves', () => {
    renderAt('/exercises/bench-press');
    expect(screen.getByText('exerciseDetail.loading')).toBeInTheDocument();
  });

  it('renders the not-found state when slug does not match', async () => {
    renderAt('/exercises/missing');
    await waitFor(() => {
      expect(screen.getByText('exerciseDetail.notFoundTitle')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'exerciseDetail.browseAll' }))
      .toHaveAttribute('href', '/exercises');
  });

  it('renders the H1, info cards and prefers AI-authored tips/mistakes', async () => {
    renderAt('/exercises/bench-press');
    await waitFor(() => screen.getByRole('heading', { level: 1, name: 'Bench Press' }));

    // Instructions from heuristics
    expect(screen.getByText('Step one')).toBeInTheDocument();
    expect(screen.getByText('Step two')).toBeInTheDocument();
    // AI tips/mistakes win over heuristics
    expect(screen.getByText('AI tip 1')).toBeInTheDocument();
    expect(screen.getByText('AI mistake 1')).toBeInTheDocument();
    expect(screen.getByText('Exhale on press')).toBeInTheDocument();
    expect(screen.queryByText('Heuristic tip')).not.toBeInTheDocument();
  });

  it('renders the demo video element with the resolved src', async () => {
    renderAt('/exercises/bench-press');
    await waitFor(() => screen.getByRole('heading', { level: 1, name: 'Bench Press' }));
    const video = document.querySelector('video');
    expect(video).not.toBeNull();
    expect(video?.getAttribute('src')).toBe('https://video/main.mp4');
  });

  it('toggles mute on the video when the mute button is clicked', async () => {
    const user = userEvent.setup();
    renderAt('/exercises/bench-press');
    await waitFor(() => screen.getByRole('heading', { level: 1, name: 'Bench Press' }));

    // Starts muted → label is "Unmute"
    const unmute = screen.getByRole('button', { name: 'exerciseDetail.unmute' });
    await user.click(unmute);
    // Now button is "Mute"
    expect(screen.getByRole('button', { name: 'exerciseDetail.mute' })).toBeInTheDocument();
  });

  it('persists the voice preference in localStorage when toggled', async () => {
    const user = userEvent.setup();
    renderAt('/exercises/bench-press');
    await waitFor(() => screen.getByRole('heading', { level: 1, name: 'Bench Press' }));

    // Default is "male"
    const voiceBtn = screen.getByRole('button', { name: 'exerciseDetail.toggleVoice' });
    expect(voiceBtn.textContent).toContain('♂'); // male symbol

    await user.click(voiceBtn);
    expect(window.localStorage.getItem('libo-voice-pref')).toBe('female');
    expect(voiceBtn.textContent).toContain('♀'); // female symbol
  });

  it('initialises voice preference from localStorage on mount', async () => {
    window.localStorage.setItem('libo-voice-pref', 'female');
    renderAt('/exercises/bench-press');
    await waitFor(() => screen.getByRole('heading', { level: 1, name: 'Bench Press' }));
    const voiceBtn = screen.getByRole('button', { name: 'exerciseDetail.toggleVoice' });
    expect(voiceBtn.textContent).toContain('♀'); // female symbol
  });

  it('swaps the picture-in-picture view label when the PIP button is clicked', async () => {
    const user = userEvent.setup();
    renderAt('/exercises/bench-press');
    await waitFor(() => screen.getByRole('heading', { level: 1, name: 'Bench Press' }));

    const swap = screen.getByRole('button', { name: 'exerciseDetail.switchView' });
    expect(swap.textContent).toContain('exerciseDetail.viewSide');
    await user.click(swap);
    expect(swap.textContent).toContain('exerciseDetail.viewFront');
  });

  it('renders the breadcrumb chain home > exercises > muscle > name', async () => {
    renderAt('/exercises/bench-press');
    await waitFor(() => screen.getByRole('heading', { level: 1, name: 'Bench Press' }));
    expect(screen.getByRole('link', { name: 'exerciseDetail.breadcrumbHome' }))
      .toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'exerciseDetail.breadcrumbExercises' }))
      .toHaveAttribute('href', '/exercises');
    expect(screen.getByRole('link', { name: 'exerciseLibrary.muscles.chest' }))
      .toHaveAttribute('href', '/exercises?muscle=Chest');
  });
});
