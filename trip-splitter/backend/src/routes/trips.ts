import { Router, Request, Response, NextFunction } from "express";
import * as tripService from "../services/tripService";
import * as expenseService from "../services/expenseService";
import * as balanceService from "../services/balanceService";

export const router = Router();

// R1
router.post("/trips", (req: Request, res: Response, next: NextFunction) => {
  try {
    const trip = tripService.createTrip(req.body?.name);
    res.status(201).json(trip);
  } catch (e) {
    next(e);
  }
});

router.get("/trips/:tripId", (req: Request, res: Response, next: NextFunction) => {
  try {
    const trip = tripService.getTrip(req.params.tripId);
    const participants = tripService.listParticipants(req.params.tripId);
    res.json({ ...trip, participants });
  } catch (e) {
    next(e);
  }
});

// R2
router.post(
  "/trips/:tripId/participants",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const participant = tripService.addParticipant(req.params.tripId, req.body?.name);
      res.status(201).json(participant);
    } catch (e) {
      next(e);
    }
  }
);

// R3, R8
router.post(
  "/trips/:tripId/expenses",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const expense = expenseService.addExpense(req.params.tripId, {
        description: req.body?.description,
        amountCents: req.body?.amountCents,
        paidBy: req.body?.paidBy,
        splitAmong: req.body?.splitAmong,
      });
      res.status(201).json(expense);
    } catch (e) {
      next(e);
    }
  }
);

// R7
router.get(
  "/trips/:tripId/expenses",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(expenseService.listExpenses(req.params.tripId));
    } catch (e) {
      next(e);
    }
  }
);

// R5
router.get(
  "/trips/:tripId/balances",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(balanceService.getBalances(req.params.tripId));
    } catch (e) {
      next(e);
    }
  }
);

// R6
router.get(
  "/trips/:tripId/settlements",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(balanceService.getSettlements(req.params.tripId));
    } catch (e) {
      next(e);
    }
  }
);
