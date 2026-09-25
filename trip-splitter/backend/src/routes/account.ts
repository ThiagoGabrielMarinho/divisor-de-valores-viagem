import { Router, Request, Response, NextFunction } from "express";
import { AuthenticatedRequest, requireSession } from "../middleware/auth";
import { getGlobalBalanceDetails, getGlobalBalances } from "../services/globalBalanceService";
import { findUserByEmail } from "../services/authService";

export const accountRouter = Router();
accountRouter.use(requireSession);

accountRouter.get("/lookup", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = typeof req.query.email === "string" ? req.query.email : "";
    if (!email.trim()) {
      res.status(400).json({ error: "Informe um email para buscar." });
      return;
    }
    const user = await findUserByEmail(email);
    if (!user) {
      res.status(404).json({ error: "Nenhuma conta encontrada com esse email." });
      return;
    }
    res.json({ id: user.id, nome: user.nome, email: user.email });
  } catch (error) { next(error); }
});

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
