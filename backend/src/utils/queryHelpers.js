const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const isObjectId = (value) =>
  typeof value === 'string' && OBJECT_ID_REGEX.test(value);

// Doc rule: ?page=1&limit=20 (default 20, max 100)
const getPagination = (query) => {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);
  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;
  return { page, limit, skip: (page - 1) * limit };
};

const buildMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

// Doc rule: ?sort=createdAt&order=desc
const getSort = (query, allowedFields, defaultField, defaultOrder) => {
  const field = allowedFields.includes(query.sort) ? query.sort : defaultField;
  const order =
    query.order === 'asc' || query.order === 'desc' ? query.order : defaultOrder;
  const direction = order === 'asc' ? 1 : -1;
  const sort = { [field]: direction };
  if (field !== '_id') sort._id = direction; // stable pagination
  return sort;
};

module.exports = { isObjectId, getPagination, buildMeta, getSort };
