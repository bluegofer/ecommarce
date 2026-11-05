'use client';

import styles from './VariantPicker.module.css';

export interface VariantOption {
  /** Attribute key e.g. "color", "size". */
  key: string;
  /** Locale-resolved label e.g. "Color: Midnight Blue". */
  label: string;
  /** All possible values. */
  values: { value: string; label: string; available: boolean }[];
}

export interface VariantPickerProps {
  groups: VariantOption[];
  /** Currently selected value per attribute key. */
  selected: Record<string, string>;
  onChange: (key: string, value: string) => void;
  locale: 'bn' | 'en';
}

/** Color swatch map — UI Spec C3: 32px circles with white border + selected ring. */
const COLOR_HEX: Record<string, string> = {
  black: '#0F172A',
  white: '#FFFFFF',
  blue: '#25729A',
  red: '#D62828',
  green: '#16A34A',
  yellow: '#F5A623',
  gray: '#64748B',
  grey: '#64748B',
  brown: '#8B5E3C',
  pink: '#E11D48',
  purple: '#7C3AED',
  orange: '#FF8A1E',
};

export function VariantPicker({ groups, selected, onChange, locale }: VariantPickerProps) {
  if (groups.length === 0) return null;

  return (
    <div className={styles.wrap}>
      {groups.map((group) => (
        <div key={group.key} className={styles.group}>
          <div className={styles.groupLabel}>{group.label}</div>
          {group.key === 'color' ? (
            <div className={styles.swatches} role="radiogroup" aria-label={group.label}>
              {group.values.map((v) => {
                const isSelected = selected[group.key] === v.value;
                const hex = COLOR_HEX[v.value.toLowerCase()] ?? v.value;
                return (
                  <button
                    key={v.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={v.label}
                    disabled={!v.available}
                    onClick={() => onChange(group.key, v.value)}
                    className={[styles.swatch, isSelected ? styles.swatchActive : ''].filter(Boolean).join(' ')}
                    style={{ background: hex }}
                  />
                );
              })}
            </div>
          ) : (
            <div className={styles.chips} role="radiogroup" aria-label={group.label}>
              {group.values.map((v) => {
                const isSelected = selected[group.key] === v.value;
                return (
                  <button
                    key={v.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={!v.available}
                    onClick={() => onChange(group.key, v.value)}
                    className={[styles.chip, isSelected ? styles.chipActive : ''].filter(Boolean).join(' ')}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
      {locale === 'bn' ? null : null}
    </div>
  );
}