import { runP4eStartupGateContractTests } from "../utils/runP4eStartupGateSelftest";
import { runHttpSchedulerContractTests } from "./httpScheduler.contract";

async function main(): Promise<void> {
  await runP4eStartupGateContractTests();
  await runHttpSchedulerContractTests();
  // eslint-disable-next-line no-console
  console.log("p4e-selftest: OK");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
