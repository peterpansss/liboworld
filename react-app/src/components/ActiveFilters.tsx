import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from '../utils/icons';
import './ActiveFilters.css';

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
}

interface Props {
  filters: ActiveFilter[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
}

export function ActiveFilters({ filters, onRemove, onClearAll }: Props): ReactElement | null {
  const { t } = useTranslation();
  if (filters.length === 0) return null;

  return (
    <div className="active-filters">
      {filters.map((filter) => (
        <span key={`${filter.key}:${filter.value}`} className="active-filters__pill">
          <span className="active-filters__label">{filter.label}</span>
          <button
            type="button"
            className="active-filters__remove"
            aria-label={`Remove ${filter.label} filter`}
            onClick={() => onRemove(filter.key)}
          >
            <X size={12} strokeWidth={2.25} aria-hidden="true" />
          </button>
        </span>
      ))}
      {filters.length > 1 && (
        <button
          type="button"
          className="active-filters__clear"
          onClick={onClearAll}
        >
          {t('common.clearAll')}
        </button>
      )}
    </div>
  );
}
