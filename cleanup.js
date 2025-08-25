const fs = require('fs');
const path = require('path');
const { rmSync } = require('fs');

// Files to be removed (backend-related and electron-related files in frontend)
const filesToRemove = [
  // Backend server files
  'unified-server.js',
  'simple-unified-server.js',
  'create-db.js',
  'test-db.js',
  'update-schema.js',
  // Electron app files
  'main.js',
  'preload.js',
  // Empty server files
  'src/server.js',
  'src/server.ts',
  'src/simple-server.js'
];

// Directories to be removed
const dirsToRemove = [
  'pages'
];

// Files to be checked and removed if empty
const emptyFilesToCheck = [
  'src/server.js',
  'src/server.ts',
  'src/simple-server.js'
];

// For each file, check if it exists and remove it
filesToRemove.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Removed ${file}`);
    } catch (error) {
      console.error(`❌ Error removing ${file}:`, error.message);
    }
  } else {
    console.log(`⏭️ File ${file} does not exist, skipping.`);
  }
});

// For each directory, check if it exists and remove it recursively
dirsToRemove.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  
  if (fs.existsSync(dirPath)) {
    try {
      rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ Removed directory ${dir}`);
    } catch (error) {
      console.error(`❌ Error removing directory ${dir}:`, error.message);
    }
  } else {
    console.log(`⏭️ Directory ${dir} does not exist, skipping.`);
  }
});

// Check for empty files and remove them
emptyFilesToCheck.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (fs.existsSync(filePath)) {
    try {
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        fs.unlinkSync(filePath);
        console.log(`✅ Removed empty file ${file}`);
      } else {
        const content = fs.readFileSync(filePath, 'utf8').trim();
        if (content === '') {
          fs.unlinkSync(filePath);
          console.log(`✅ Removed empty file (whitespace only) ${file}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error checking/removing empty file ${file}:`, error.message);
    }
  }
});

// Check if quizmaster.db exists in root and prompt to migrate
const dbPath = path.join(__dirname, 'quizmaster.db');
if (fs.existsSync(dbPath)) {
  console.log('\n⚠️ Found quizmaster.db in project root.');
  console.log('After confirming your backend is working properly with its own database,');
  console.log('you may want to delete this file to avoid confusion.');
  console.log('Run the following to migrate and then delete the root database:');
  console.log('\ncd backend && npm run migrate && cd .. && del quizmaster.db');
}

// Check package.json for dependencies that can be removed
try {
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const unnecessaryDeps = [];
  
  // Check for unnecessary dependencies
  const depsToCheck = [
    'better-sqlite3',
    'electron',
    'sqlite3',
    '@types/better-sqlite3',
    '@types/sqlite3'
  ];
  
  for (const dep of depsToCheck) {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      unnecessaryDeps.push(dep);
    }
    if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
      unnecessaryDeps.push(dep);
    }
  }
  
  if (unnecessaryDeps.length > 0) {
    console.log('\n⚠️ The following dependencies can be removed from package.json:');
    console.log(unnecessaryDeps.join(', '));
    console.log('Run the following to remove them:');
    console.log(`npm uninstall ${unnecessaryDeps.join(' ')}`);
  }
} catch (error) {
  console.error('Error checking package.json:', error.message);
}

console.log('\n✅ Cleanup completed!');
console.log('✅ The project structure has been updated to separate frontend and backend.');
