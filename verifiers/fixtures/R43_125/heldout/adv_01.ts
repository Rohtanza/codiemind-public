export interface Options {
  verbose: boolean;
}

export type Props<
  T extends Record<string, unknown>,
> = {
  values: T;
  options: Options;
};
