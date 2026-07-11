import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { workspaceIntelligenceService } from "./services/workspace-intelligence.service.js";

const app = createApp();
workspaceIntelligenceService.validateConfiguration();

app.listen(env.PORT, () => {
  console.log(`OpenForge API listening on http://localhost:${env.PORT}`);
  void workspaceIntelligenceService.recoverJobs().catch((error)=>console.error("Workspace processor startup failed",error));
});

