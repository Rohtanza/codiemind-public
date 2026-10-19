import chalk from 'chalk';
import { Command } from 'commander';
import { runMigrations } from './migrate.js';
import { loadEnv } from './env.js';

const program = new Command();

program
  .command('migrate')
  .option('--dry-run')
  .action(async (opts) => {
    loadEnv();
    const { default: ora } = await import('ora');
    const spinner = ora('Running migrations').start();
    await runMigrations({ dryRun: Boolean(opts.dryRun) });
    spinner.succeed(chalk.green('Done'));
  });

program.parse(process.argv);
