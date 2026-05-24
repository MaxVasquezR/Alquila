import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración inicial — en desarrollo TypeORM synchronize también aplica el esquema.
 * Usar migration:run en producción.
 */
export class InitialSchema1730000000000 implements MigrationInterface {
  name = 'InitialSchema1730000000000';

  public async up(_queryRunner: QueryRunner): Promise<void> {
    // Esquema gestionado por entities + synchronize en dev.
    // En producción, generar con: npm run migration:generate -- src/migrations/InitialSchema
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // noop
  }
}
