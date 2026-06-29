import yahooFinance from 'yahoo-finance2';

async function test() {
  try {
    const data = await yahooFinance.historical('AAPL', { period1: '2023-01-01' });
    console.log("SUCCESS:", data.length);
  } catch (e) {
    console.error("ERROR:", e);
  }
}
test();
