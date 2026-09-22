import { Router, Request, Response, NextFunction } from "express";
import { AuthenticatedRequest, requireSession } from "../middleware/auth";
import { getGlobalBalanceDetails, getGlobalBalances } from "../services/globalBalanceService";

export const accountRouter = Router();
accountRouter.use(requireSession);

accountRouter.get("/balances", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).authUser!.id;
    res.json(await getGlobalBalances(userId));
  } catch (error) { next(error); }
});

accountRouter.get("/balances/:userId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).authUser!.id;
    res.json(await getGlobalBalanceDetails(userId, req.params.userId));
  } catch (error) { next(error); }
});
