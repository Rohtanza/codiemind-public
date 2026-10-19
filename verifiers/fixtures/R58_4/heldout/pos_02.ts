type LogRecord = { level: string; message: string };

/*
 * Analyse the log lines and serialise the warnings
 * so the catalogue service can store them.
 */
export function analyseLogs(lines: string[]): LogRecord[] {
  return lines
    .map((line) => {
      const [level, ...rest] = line.split(" ");
      return { level, message: rest.join(" ") };
    })
    .filter((record) => record.level === "WARN");
}

export const serialiseRecords = (records: LogRecord[]): string => JSON.stringify(records);
