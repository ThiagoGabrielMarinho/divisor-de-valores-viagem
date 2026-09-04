export class ValidationError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  status = 404;
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export interface Trip {
  id: string;
  name: string;
  currency: string;
  created_at: string;
}

export interface Participant {
  id: string;
  trip_id: string;
  name: string;
}

export interface Expense {
  id: string;
  trip_id: string;
  description: string;
  amount_cents: number;
  paid_by: string;
  created_at: string;
  shares: { participant_id: string; share_cents: number }[];
}

export interface Balance {
  participant_id: string;
  name: string;
  balance_cents: number; // positivo = a receber, negativo = a pagar
}

export interface Settlement {
  from: string; // participant id (quem paga)
  from_name: string;
  to: string; // participant id (quem recebe)
  to_name: string;
  amount_cents: number;
}
