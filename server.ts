import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { SQLiteAeroForgRepository } from "./src/repositories/SQLiteRepository";
import { IAeroForgRepository } from "./src/repositories/IAeroForgRepository";

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const repo: IAeroForgRepository = new SQLiteAeroForgRepository("aeroforg.db");

  // API Routes
  app.get("/api/helios/orders", async (req, res) => {
    try {
      const orders = await repo.getHeliosOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await repo.getHeliosOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/helios/orders", async (req, res) => {
    try {
      const order = await repo.createHeliosOrder(req.body);
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put("/api/helios/orders/:id", async (req, res) => {
    try {
      await repo.updateHeliosOrder(req.params.id, req.body);
      const updated = await repo.getHeliosOrderById(req.params.id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/helios/orders/:id", async (req, res) => {
    try {
      await repo.deleteHeliosOrder(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/helios/orders", async (req, res) => {
    try {
      await repo.deleteAllHeliosOrders();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/helios/orders/import", async (req, res) => {
    try {
      const orders = req.body;
      let count = 0;
      for (const order of orders) {
        await repo.importHeliosOrder(order);
        count++;
      }
      res.json({ success: true, count });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/helios/review-queue", async (req, res) => {
    try {
      const orders = await repo.getHeliosOrders();
      const mappedJobs = await repo.getPlanningJobs();
      const mappedHeliosIds = new Set(mappedJobs.map(j => j.helios_order_id));
      const unmapped = orders.filter(o => !mappedHeliosIds.has(o.id));
      res.json(unmapped);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/planning/jobs/from-helios/:heliosOrderId", async (req, res) => {
    try {
      const job = await repo.createPlanningJob(req.params.heliosOrderId, req.body?.userId);
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/planning/jobs", async (req, res) => {
    try {
      const jobs = await repo.getPlanningJobs();
      const enrichedJobs = await Promise.all(
        jobs.map(async (job) => {
          const metrics = await repo.calculateJobRealisationMetrics(job.id);
          const heliosOrder = await repo.getHeliosOrderById(job.helios_order_id);
          return {
            ...job,
            ...metrics,
            heliosOrder
          };
        })
      );
      res.json(enrichedJobs);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/scheduler/jobs", async (req, res) => {
    try {
      const jobs = await repo.getPlanningJobs();
      const allowedStatuses = ["READY_TO_SCHEDULE", "SCHEDULED", "IN_PROGRESS", "BLOCKED", "FINISH"];
      const schedulerJobs = jobs.filter(j => allowedStatuses.includes(j.job_status));
      const teams = await repo.getTeams();
      const enrichedJobs = await Promise.all(
        schedulerJobs.map(async (job) => {
          const metrics = await repo.calculateJobRealisationMetrics(job.id);
          const tasks = await repo.getPlanningTasks(job.id);
          const heliosOrder = await repo.getHeliosOrderById(job.helios_order_id);
          const team = job.assigned_team_id ? teams.find(t => t.id === job.assigned_team_id) : null;
          return {
            ...job,
            ...metrics,
            tasks,
            heliosOrder,
            assigned_team_name: team ? team.name : null,
            erp_order_id: heliosOrder?.erp_order_id || '',
            designation: heliosOrder?.designation || '',
            part_reference: heliosOrder?.part_reference || '',
            aircraft_zone: heliosOrder?.aircraft_zone || '',
            work_center_code: heliosOrder?.work_center_code || '',
            quantity: heliosOrder?.quantity || 0,
            estimated_load_hours: heliosOrder?.estimated_load_hours || 0,
            raw_helios_row: heliosOrder?.raw_helios_row || null,
          };
        })
      );
      res.json(enrichedJobs);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/scheduler/unscheduled-jobs", async (req, res) => {
    try {
      const jobs = await repo.getPlanningJobs();
      const unscheduled = jobs.filter(j => j.job_status === "READY_TO_SCHEDULE");
      
      const enrichedJobs = await Promise.all(
        unscheduled.map(async (job) => {
          const heliosOrder = await repo.getHeliosOrderById(job.helios_order_id);
          return { ...job, heliosOrder };
        })
      );
      res.json(enrichedJobs);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/planning/jobs/:jobId/tasks/generate", async (req, res) => {
    try {
      // Basic mock generation of a task
      const task = await repo.createPlanningTask({ 
        planning_job_id: req.params.jobId,
        label: "Auto-generated Task",
        estimated_hours: 10
      });
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.patch("/api/planning/jobs/:jobId", async (req, res) => {
    try {
      await repo.updatePlanningJob(req.params.jobId, req.body);
      const job = await repo.getPlanningJobById(req.params.jobId);
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/planning/jobs/:jobId", async (req, res) => {
    try {
      await repo.deletePlanningJob(req.params.jobId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.patch("/api/planning/tasks/:taskId", async (req, res) => {
    try {
      if (req.body.task_status) await repo.updateTaskStatus(req.params.taskId, req.body.task_status as any);
      if (req.body.assigned_operator_id) await repo.assignOperatorToTask(req.params.taskId, req.body.assigned_operator_id);
      res.json({ success: true });
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

  app.post("/api/mapping", async (req, res) => {
    try {
      if (Array.isArray(req.body)) {
        await repo.saveFeedbackMappings(req.body);
        res.json({ success: true });
      } else {
        const item = await repo.createFeedbackMapping(req.body);
        res.json(item);
      }
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put("/api/mapping/:id", async (req, res) => {
    try {
      await repo.updateFeedbackMapping(req.params.id, req.body);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/mapping/:id", async (req, res) => {
    try {
      await repo.deleteFeedbackMapping(req.params.id);
      res.json({ success: true });
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

  app.get("/api/users", async (req, res) => {
    try {
      res.json(await repo.getAppUsers());
    } catch (error) { res.status(500).json({ error: (error as Error).message }); }
  });

  let currentUserStore: string | null = null;

  app.get("/api/users/current", async (req, res) => {
    try {
      if (!currentUserStore) {
        const users = await repo.getAppUsers();
        const planner = users.find(u => u.role === "PLANNER") || users[0];
        if (planner) currentUserStore = planner.id;
      }
      if (currentUserStore) {
        res.json(await repo.getAppUserById(currentUserStore));
      } else {
        res.json(null);
      }
    } catch (error) { res.status(500).json({ error: (error as Error).message }); }
  });

  app.post("/api/users/current", async (req, res) => {
    try {
      currentUserStore = req.body.userId;
      res.json({ success: true });
    } catch (error) { res.status(500).json({ error: (error as Error).message }); }
  });

  app.get("/api/teams", async (req, res) => {
    try { res.json(await repo.getTeams()); }
    catch (e) { res.status(500).json({ error: (e as Error).message }); }
  });

  app.get("/api/operators", async (req, res) => {
    try { res.json(await repo.getOperators()); }
    catch (e) { res.status(500).json({ error: (e as Error).message }); }
  });

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

startServer().catch((err) => {
  console.error("Error starting server:", err);
  process.exit(1);
});
