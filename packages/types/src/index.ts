export type Poisha = number;

export interface Money {
  amount: Poisha;
  currency: 'BDT';
}

export type Locale = 'bn' | 'en';

export * from './auth';