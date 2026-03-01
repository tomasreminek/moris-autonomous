/**
 * Backup & Restore System
 * Automated backups with compression
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const { logger } = require('./logger');

class BackupManager {
  constructor(config = {}) {
    this.config = {
      backupDir: config.backupDir || './backups',
      maxBackups: config.maxBackups || 10,
      compression: config.compression !== false,
      ...config
    };
    this.ensureBackupDir();
  }

  async ensureBackupDir() {
    try {
      await fs.mkdir(this.config.backupDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create backup directory:', error);
    }
  }

  // Create full system backup
  async createBackup(type = 'full') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `backup_${type}_${timestamp}`;
    const backupPath = path.join(this.config.backupDir, backupId);

    logger.info(`Creating ${type} backup: ${backupId}`);

    try {
      await fs.mkdir(backupPath, { recursive: true });

      const backupData = {
        id: backupId,
        type,
        timestamp: new Date().toISOString(),
        version: '2.1.0',
        components: {}
      };

      // Backup database
      if (type === 'full' || type === 'database') {
        backupData.components.database = await this.backupDatabase(backupPath);
      }

      // Backup logs
      if (type === 'full' || type === 'logs') {
        backupData.components.logs = await this.backupLogs(backupPath);
      }

      // Backup reports
      if (type === 'full' || type === 'reports') {
        backupData.components.reports = await this.backupReports(backupPath);
      }

      // Backup configuration
      backupData.components.config = await this.backupConfig(backupPath);

      // Save backup manifest
      await fs.writeFile(
        path.join(backupPath, 'manifest.json'),
        JSON.stringify(backupData, null, 2)
      );

      // Compress if enabled
      if (this.config.compression) {
        await this.compressBackup(backupPath);
      }

      // Clean old backups
      await this.cleanOldBackups();

      logger.info(`Backup completed: ${backupId}`);
      return backupData;

    } catch (error) {
      logger.error(`Backup failed: ${backupId}`, error);
      throw error;
    }
  }

  // Backup database
  async backupDatabase(backupPath) {
    const dbPath = './data/moris.db';
    const dbBackupPath = path.join(backupPath, 'database');
    
    await fs.mkdir(dbBackupPath, { recursive: true });
    
    // Copy database file
    await fs.copyFile(dbPath, path.join(dbBackupPath, 'moris.db'));
    
    // Also copy WAL and SHM files if they exist
    const walFile = dbPath + '-wal';
    const shmFile = dbPath + '-shm';
    
    try {
      await fs.copyFile(walFile, path.join(dbBackupPath, 'moris.db-wal'));
    } catch (e) { /* WAL may not exist */ }
    
    try {
      await fs.copyFile(shmFile, path.join(dbBackupPath, 'moris.db-shm'));
    } catch (e) { /* SHM may not exist */ }

    const stats = await fs.stat(path.join(dbBackupPath, 'moris.db'));
    
    return {
      path: 'database/',
      size: stats.size,
      tables: ['agents', 'tasks', 'activity_logs', 'reports']
    };
  }

  // Backup logs
  async backupLogs(backupPath) {
    const logsPath = './logs';
    const logsBackupPath = path.join(backupPath, 'logs');
    
    try {
      await fs.mkdir(logsBackupPath, { recursive: true });
      
      const files = await fs.readdir(logsPath);
      let totalSize = 0;
      
      for (const file of files) {
        const srcPath = path.join(logsPath, file);
        const destPath = path.join(logsBackupPath, file);
        
        const stats = await fs.stat(srcPath);
        if (stats.isFile()) {
          await fs.copyFile(srcPath, destPath);
          totalSize += stats.size;
        }
      }
      
      return {
        path: 'logs/',
        size: totalSize,
        files: files.length
      };
    } catch (error) {
      logger.warn('Failed to backup logs:', error.message);
      return { path: 'logs/', size: 0, files: 0, error: error.message };
    }
  }

  // Backup reports
  async backupReports(backupPath) {
    const reportsPath = './reports';
    const reportsBackupPath = path.join(backupPath, 'reports');
    
    try {
      await fs.mkdir(reportsBackupPath, { recursive: true });
      
      const files = await fs.readdir(reportsPath);
      let totalSize = 0;
      
      for (const file of files) {
        const srcPath = path.join(reportsPath, file);
        const destPath = path.join(reportsBackupPath, file);
        
        const stats = await fs.stat(srcPath);
        if (stats.isFile()) {
          await fs.copyFile(srcPath, destPath);
          totalSize += stats.size;
        }
      }
      
      return {
        path: 'reports/',
        size: totalSize,
        files: files.length
      };
    } catch (error) {
      logger.warn('Failed to backup reports:', error.message);
      return { path: 'reports/', size: 0, files: 0, error: error.message };
    }
  }

  // Backup configuration
  async backupConfig(backupPath) {
    const configBackupPath = path.join(backupPath, 'config');
    await fs.mkdir(configBackupPath, { recursive: true });
    
    const configFiles = [
      '.env',
      'docker-compose.yml',
      'nginx.conf'
    ];
    
    const backedUp = [];
    
    for (const file of configFiles) {
      try {
        await fs.copyFile(file, path.join(configBackupPath, file));
        backedUp.push(file);
      } catch (e) {
        // File may not exist
      }
    }
    
    return {
      path: 'config/',
      files: backedUp
    };
  }

  // Compress backup
  async compressBackup(backupPath) {
    return new Promise((resolve, reject) => {
      const tar = spawn('tar', ['-czf', `${backupPath}.tar.gz`, '-C', this.config.backupDir, path.basename(backupPath)]);
      
      tar.on('close', async (code) => {
        if (code === 0) {
          // Remove uncompressed directory
          await fs.rm(backupPath, { recursive: true, force: true });
          resolve();
        } else {
          reject(new Error(`tar exited with code ${code}`));
        }
      });
      
      tar.on('error', reject);
    });
  }

  // Restore from backup
  async restoreBackup(backupId) {
    const backupPath = path.join(this.config.backupDir, backupId);
    const compressedPath = `${backupPath}.tar.gz`;
    
    logger.info(`Restoring backup: ${backupId}`);

    try {
      // Decompress if needed
      if (await this.fileExists(compressedPath)) {
        await this.decompressBackup(compressedPath, backupPath);
      }

      // Read manifest
      const manifestPath = path.join(backupPath, 'manifest.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

      // Restore database
      if (manifest.components.database) {
        await this.restoreDatabase(backupPath);
      }

      // Restore logs
      if (manifest.components.logs) {
        await this.restoreLogs(backupPath);
      }

      // Restore reports
      if (manifest.components.reports) {
        await this.restoreReports(backupPath);
      }

      logger.info(`Restore completed: ${backupId}`);
      return { success: true, backupId, manifest };

    } catch (error) {
      logger.error(`Restore failed: ${backupId}`, error);
      throw error;
    }
  }

  // Decompress backup
  async decompressBackup(compressedPath, extractPath) {
    return new Promise((resolve, reject) => {
      const tar = spawn('tar', ['-xzf', compressedPath, '-C', this.config.backupDir]);
      
      tar.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`tar extraction failed with code ${code}`));
        }
      });
      
      tar.on('error', reject);
    });
  }

  // Restore database
  async restoreDatabase(backupPath) {
    const dbBackupPath = path.join(backupPath, 'database', 'moris.db');
    const dbPath = './data/moris.db';
    
    // Create backup of current database
    await fs.copyFile(dbPath, `${dbPath}.restore-backup`);
    
    // Restore from backup
    await fs.copyFile(dbBackupPath, dbPath);
    
    logger.info('Database restored');
  }

  // Restore logs
  async restoreLogs(backupPath) {
    const logsBackupPath = path.join(backupPath, 'logs');
    const logsPath = './logs';
    
    const files = await fs.readdir(logsBackupPath);
    
    for (const file of files) {
      await fs.copyFile(
        path.join(logsBackupPath, file),
        path.join(logsPath, file)
      );
    }
    
    logger.info('Logs restored');
  }

  // Restore reports
  async restoreReports(backupPath) {
    const reportsBackupPath = path.join(backupPath, 'reports');
    const reportsPath = './reports';
    
    const files = await fs.readdir(reportsBackupPath);
    
    for (const file of files) {
      await fs.copyFile(
        path.join(reportsBackupPath, file),
        path.join(reportsPath, file)
      );
    }
    
    logger.info('Reports restored');
  }

  // List all backups
  async listBackups() {
    try {
      const files = await fs.readdir(this.config.backupDir);
      const backups = [];
      
      for (const file of files) {
        if (file.startsWith('backup_')) {
          const stat = await fs.stat(path.join(this.config.backupDir, file));
          backups.push({
            id: file.replace('.tar.gz', ''),
            filename: file,
            size: stat.size,
            created: stat.birthtime
          });
        }
      }
      
      return backups.sort((a, b) => b.created - a.created);
    } catch (error) {
      logger.error('Failed to list backups:', error);
      return [];
    }
  }

  // Clean old backups
  async cleanOldBackups() {
    const backups = await this.listBackups();
    
    if (backups.length > this.config.maxBackups) {
      const toDelete = backups.slice(this.config.maxBackups);
      
      for (const backup of toDelete) {
        try {
          await fs.rm(path.join(this.config.backupDir, backup.filename), { force: true });
          logger.info(`Old backup removed: ${backup.filename}`);
        } catch (error) {
          logger.warn(`Failed to remove old backup: ${backup.filename}`);
        }
      }
    }
  }

  // Helper: check if file exists
  async fileExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  // Get backup stats
  async getStats() {
    const backups = await this.listBackups();
    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
    
    return {
      totalBackups: backups.length,
      totalSize,
      maxBackups: this.config.maxBackups,
      compression: this.config.compression,
      lastBackup: backups.length > 0 ? backups[0].created : null
    };
  }
}

module.exports = { BackupManager };