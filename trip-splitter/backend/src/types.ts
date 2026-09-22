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

export class AuthorizationError extends ValidationError {
  status = 403;
  constructor(message = "Você não tem permissão para esta operação.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class ConflictError extends ValidationError {
  status = 409;
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
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
  user_id?: string | null;
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
