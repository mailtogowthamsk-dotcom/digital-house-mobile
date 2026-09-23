import { runHttpSchedulerContractTests } from "./httpScheduler.contract";

runHttpSchedulerContractTests()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("p4b-selftest: OK");
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
