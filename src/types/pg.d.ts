declare module "pg" {
  export interface PoolConfig {
    connectionString?: string;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    end(): Promise<void>;
  }
}
