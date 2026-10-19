export interface Repo {
  name: string;
}

export type Cache<K extends Map<string, Array<number>>> = {
  store: K;
  hits: number;
};
