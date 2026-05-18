import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { SQLiteAeroForgRepository } from "./src/repositories/SQLiteRepository";
import { IAeroForgRepository } from "./src/repositories/IAeroForgRepository";

async function startServer() {
  const app = express();
  app.use(express.json());

  const repo: IAeroForgRepository = new SQLiteAeroForgRepository("aeroforg.db");

  // API Routes
  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await repo.getHeliosOrders();
      const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
          const metrics = await repo.calculateOrderRealisationMetrics(order.id);
          return {
            ...order,
            ...metrics
          };
        })
      );
      res.json(enrichedOrders);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/mapping", async (req, res) => {
    try {
      const mapping = await repo.getFeedbackMappings();
      res.json(mapping);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/export-csv", async (req, res) => {
    try {
      const csv = await repo.exportHeliosFeedbackCsv();
      res.json({ 
        message: "CSV Generated successfully", 
        downloadUrl: "#",
        content: csv // For demo visibility
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Mode Info API
  app.get("/api/info", (req, res) => {
    res.json({
      db_mode: "SQLite",
      environment: process.env.NODE_ENV || "development"
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
