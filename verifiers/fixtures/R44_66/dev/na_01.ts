import { formatCurrency } from "./format";

const prices = [12.5, 7, 3.25];
const total = prices.reduce((sum, p) => sum + p, 0);

console.log(`Total: ${formatCurrency(total)}`);
