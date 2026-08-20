import { db } from '@workspace/db';

export { db };

export async function testDatabaseConnection() {
  try {
    await db.execute('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
