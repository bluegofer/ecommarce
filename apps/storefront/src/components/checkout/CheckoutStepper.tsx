import styles from './CheckoutStepper.module.css';

export interface CheckoutStepperProps {
  /** 1-based current step. */
  current: 1 | 2 | 3;
  labels: [string, string, string];
  /** Click handler per step (only back-navigation enabled). */
  onStepClick?: (step: 1 | 2 | 3) => void;
}

/**
 * Checkout progress stepper (UI Spec C5).
 * Step circles 32px: done = ✓ bg #2E8CBC; current = number bg Sky-300 border #2E8CBC;
 * upcoming = number bg white border #D9E5EE text muted; connector 2px #B8E2F5.
 */
export function CheckoutStepper({ current, labels, onStepClick }: CheckoutStepperProps) {
  return (
    <nav className={styles.wrap} aria-label="Checkout steps">
      {[1, 2, 3].map((step, idx) => {
        const n = step as 1 | 2 | 3;
        const state = n < current ? 'done' : n === current ? 'current' : 'upcoming';
        const clickable = onStepClick && n < current;
        return (
          <div key={n} className={styles.stepWrap}>
            <button
              type="button"
              className={[styles.step, styles[state]].join(' ')}
              disabled={!clickable}
              onClick={() => clickable && onStepClick!(n)}
              aria-current={state === 'current' ? 'step' : undefined}
              aria-label={`${n}. ${labels[idx]}`}
            >
              <span className={styles.circle} aria-hidden="true">
                {state === 'done' ? '✓' : n}
              </span>
              <span className={styles.label}>{labels[idx]}</span>
            </button>
            {idx < 2 ? (
              <span
                className={[styles.connector, n < current ? styles.connectorDone : ''].filter(Boolean).join(' ')}
                aria-hidden="true"
              />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}