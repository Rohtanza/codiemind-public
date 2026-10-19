export namespace Models {
  export interface Tag {
    id: number;
  }

  export type Article = {
    title: string;
    tags: Tag[];
  };
}
