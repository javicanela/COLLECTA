import { evaluateTestDbSafety } from '../src/lib/dbSafety';

function main() {
  const result = evaluateTestDbSafety(process.env.DATABASE_URL || '', process.env);
  if (!result.safe) {
    console.error(`[assert-safe-test-db] ${result.reason}`);
    process.exit(2);
  }
  console.log(`[assert-safe-test-db] OK - ${result.reason}`);
  process.exit(0);
}

main();
