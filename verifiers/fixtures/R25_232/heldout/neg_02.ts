import { describe, it, expect } from 'vitest';

describe('report generator', () => {
  it('builds a monthly report', async () => {
    const { buildReport } = await import('../../src/reports/builder');
    const report = buildReport({ month: 3, year: 2024 });
    expect(report.rows.length).toBeGreaterThan(0);
  });
});
