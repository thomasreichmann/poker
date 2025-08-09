declare module "postgres" {
  namespace postgres {
    interface Options {
      ssl?: boolean | object;
    }
    interface Sql {
      end: () => Promise<void>;
    }
  }
  function postgres(url: string, options?: postgres.Options): postgres.Sql;
  export = postgres;
}
