const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Paths to the old and new database files
const oldDbPath = path.join(__dirname, '..', 'quizmaster.db');
const newDbPath = path.join(__dirname, 'quizmaster.db');

// Check if old database exists
if (!fs.existsSync(oldDbPath)) {
  console.log('Old database file does not exist. No migration needed.');
  process.exit(0);
}

// Check if new database already exists
if (fs.existsSync(newDbPath)) {
  console.log('Warning: New database file already exists. Migration will be skipped.');
  console.log('If you want to force migration, please delete the backend/quizmaster.db file first.');
  process.exit(0);
}

// Open the databases
const oldDb = new Database(oldDbPath);
const newDb = new Database(newDbPath);

// Begin transaction
function migrateData() {
  console.log('Starting database migration...');

  try {
    // Get schema from old database
    const tables = oldDb.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).all();
    
    // Migrate each table
    tables.forEach(table => {
      const tableName = table.name;
      console.log(`Migrating table: ${tableName}`);
      
      // Get table creation SQL
      const createTableSql = oldDb.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(tableName).sql;
      
      // Create table in new database
      newDb.exec(createTableSql);
      
      // Get all data
      const rows = oldDb.prepare(`SELECT * FROM ${tableName}`).all();
      
      if (rows.length === 0) {
        console.log(`  Table ${tableName} is empty.`);
        return;
      }
      
      console.log(`  Migrating ${rows.length} rows from ${tableName}`);
      
      // Get column names
      const columns = Object.keys(rows[0]);
      const columnNames = columns.join(', ');
      const placeholders = columns.map(() => '?').join(', ');
      
      // Prepare insert statement
      const insertStmt = newDb.prepare(`INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`);
      
      // Insert all rows in a transaction
      const insertMany = newDb.transaction((items) => {
        for (const item of items) {
          insertStmt.run(...columns.map(col => item[col]));
        }
      });
      
      insertMany(rows);
    });
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    oldDb.close();
    newDb.close();
  }
}

migrateData();
