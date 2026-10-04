// server/controllers/logController.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_FILE = path.join(__dirname, '../../logs/api.log');

// GET /api/admin/logs?limit=200&method=GET&status=200
export function getLogs(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 200;
    const methodFilter = req.query.method || '';
    const statusFilter = req.query.status || '';

    if (!fs.existsSync(LOG_FILE)) {
      return res.json({ logs: [] });
    }

    const lines = fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(Boolean);
    
    let logs = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    // 过滤
    if (methodFilter) {
      logs = logs.filter(log => log.method === methodFilter.toUpperCase());
    }
    if (statusFilter) {
      logs = logs.filter(log => String(log.status) === statusFilter);
    }

    // 取最近 limit 条
    logs = logs.slice(-limit).reverse();

    res.json({ logs });
  } catch (error) {
    console.error('[ADMIN LOGS] Error reading logs:', error);
    res.status(500).json({ message: 'Failed to read logs' });
  }
}

// GET /api/admin/logs/:id - 获取单条日志详情
export function getLogById(req, res) {
  try {
    const lines = fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(Boolean);
    
    for (const line of lines) {
      const log = JSON.parse(line);
      if (log.id === req.params.id) {
        return res.json(log);
      }
    }

    res.status(404).json({ message: 'Log not found' });
  } catch (error) {
    console.error('[ADMIN LOGS] Error reading log:', error);
    res.status(500).json({ message: 'Failed to read log' });
  }
}