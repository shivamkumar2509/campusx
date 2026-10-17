const AuditLog = require("../models/auditLog.model");

/**
 * Usage: router.post('/x', auth, audit('action.name', 'Entity'), handler)
 * The handler can set `res.locals.auditUser = user._id` and
 * `res.locals.auditEntityId = entity._id` to enrich the log entry.
 * Only logs on 2xx responses.
 */
const audit = (action, entityType = "", getEntityId = null) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // user_id can come from auth middleware OR from controller via res.locals
        const userId = req.user?.id || res.locals?.auditUser;

        if (userId) {
          const entityId =
            (getEntityId ? getEntityId(req, body) : null) ||
            res.locals?.auditEntityId ||
            null;

          AuditLog.create({
            user_id: userId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            ip_address: req.ip || "",
            metadata: {
              method: req.method,
              path: req.originalUrl,
              body: sanitize(req.body),
            },
          }).catch((err) => {
            console.error("Audit log failed:", err.message);
          });
        }
      }
      return originalJson(body);
    };
    next();
  };
};

const sanitize = (body) => {
  if (!body || typeof body !== "object") return {};
  const clone = { ...body };
  delete clone.password;
  delete clone.password_hash;
  delete clone.token;
  delete clone.video_url; // keep payloads small
  return clone;
};

module.exports = { audit };
