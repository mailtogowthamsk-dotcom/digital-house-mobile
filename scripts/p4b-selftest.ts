/**
 * Prefer: npm run test:p4b
 * (runs src/api/runP4bSelftest.ts via tsx)
 */
import { runHttpSchedulerContractTests } from "../src/api/httpScheduler.contract";

runHttpSchedulerContractTests()
  .then(() => console.log("p4b-selftest: OK"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
