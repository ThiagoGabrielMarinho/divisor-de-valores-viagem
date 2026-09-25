import { Router, Request, Response, NextFunction } from "express";
import * as tripService from "../services/tripService";
import * as expenseService from "../services/expenseService";
import * as balanceService from "../services/balanceService";
import * as obligationService from "../services/obligationService";
import { resetTripExpenses } from "../services/resetService";
import { AuthenticatedRequest, requireSession, requireTripMembership } from "../middleware/auth";

export const router = Router();

function userId(req: Request): string {
  return (req as AuthenticatedRequest).authUser!.id;
}

router.get("/trips", requireSession, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trips = await tripService.listTripsForUser(userId(req));
    res.json(trips);
  } catch (error) { next(error); }
});

router.post("/trips", requireSession, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trip = await tripService.createTripForUser(req.body?.name, userId(req));
    res.status(201).json(trip);
  } catch (error) { next(error); }
});

router.get("/trips/:tripId", requireSession, requireTripMembership(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trip = await tripService.getTrip(req.params.tripId);
    const participants = await tripService.listParticipants(req.params.tripId);
    res.json({ ...trip, participants });
  } catch (error) { next(error); }
});

router.post("/trips/:tripId/participants", requireSession, requireTripMembership("owner"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const participant = await tripService.addUserToTrip(req.params.tripId, userId(req), req.body?.userId);
    res.status(201).json(participant);
  } catch (error) { next(error); }
});

router.post("/trips/:tripId/expenses", requireSession, requireTripMembership(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await expenseService.addExpense(req.params.tripId, {
      description: req.body?.description,
      amountCents: req.body?.amountCents,
      paidBy: req.body?.paidBy,
      splitAmong: req.body?.splitAmong,
      actorUserId: userId(req),
    });
    res.status(201).json(expense);
  } catch (error) { next(error); }
});

router.get("/trips/:tripId/expenses", requireSession, requireTripMembership(), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await expenseService.listExpenses(req.params.tripId)); } catch (error) { next(error); }
});

router.get("/trips/:tripId/balances", requireSession, requireTripMembership(), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await balanceService.getBalances(req.params.tripId)); } catch (error) { next(error); }
});

router.get("/trips/:tripId/settlements", requireSession, requireTripMembership(), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await balanceService.getSettlements(req.params.tripId)); } catch (error) { next(error); }
});

router.get("/trips/:tripId/obligations", requireSession, requireTripMembership(), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await obligationService.listObligations(req.params.tripId, userId(req))); } catch (error) { next(error); }
});

router.post("/trips/:tripId/obligations", requireSession, requireTripMembership(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await obligationService.createObligation({
      tripId: req.params.tripId,
      actorUserId: userId(req),
      debtorUserId: req.body?.debtorUserId,
      creditorUserId: req.body?.creditorUserId,
      amountCents: req.body?.amountCents,
      expenseId: req.body?.expenseId,
    }));
  } catch (error) { next(error); }
});

router.post("/obligations/:obligationId/declare", requireSession, async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await obligationService.declarePayment(req.params.obligationId, userId(req))); } catch (error) { next(error); }
});

router.post("/obligations/:obligationId/confirm", requireSession, async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await obligationService.confirmReceipt(req.params.obligationId, userId(req))); } catch (error) { next(error); }
});

router.post("/obligations/:obligationId/reject", requireSession, async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await obligationService.rejectDeclaration(req.params.obligationId, userId(req))); } catch (error) { next(error); }
});

router.patch("/obligations/:obligationId/deadline", requireSession, async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await obligationService.setDeadline(req.params.obligationId, userId(req), req.body?.deadline)); } catch (error) { next(error); }
});

router.post("/trips/:tripId/reset", requireSession, requireTripMembership("owner"), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await resetTripExpenses(req.params.tripId, userId(req), req.body?.confirmed === true)); } catch (error) { next(error); }
});
