// server/src/utils/audit.js
import { supabase } from './supabase.js';
import { logger } from './logger.js';

async function auditLog(userId, action, entityType, entityId, metadata = {}, req = null) {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata,
        ip_address: req?.ip || '',
        user_agent: req?.get('user-agent') || '',
      });

    if (error) {
      logger.error('Failed to write audit log:', error);
    }
  } catch (error) {
    logger.error('Failed to write audit log:', error);
  }
}

export { auditLog };