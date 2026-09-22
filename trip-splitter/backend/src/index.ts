import "dotenv/config";
import { createApp } from "./app";
import { runMigrations } from "./db/migrate";

const PORT = process.env.PORT || 3000;
const app = createApp();

runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Trip Splitter rodando em http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Falha ao migrar o banco de dados:", err);
    process.exit(1);
  });

export { app };
