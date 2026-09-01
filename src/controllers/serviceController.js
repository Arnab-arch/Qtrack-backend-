import pool from "../config/db.js";

export const getServices = async (req, res) => {
  try {
    const { location_id, search, status = "active" } = req.query;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 8));
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        s.*,
        l.name        AS location_name,
        l.city        AS location_city,
        l.state       AS location_state
      FROM services s
      JOIN locations l ON s.location_id = l.location_id
      WHERE  l.is_active = true
    `;
    let countQuery = `
      SELECT COUNT(*)
      FROM services s
      JOIN locations l ON s.location_id = l.location_id
      WHERE s.is_active = true AND l.is_active = true
    `;
    const params = [];

    if (location_id) {
      params.push(location_id);
      query += ` AND s.location_id = $${params.length}`;
      countQuery += ` AND s.location_id = $${params.length}`;
    }

    

    if (status === "active") {
      query += `AND s.is_active = true`;
      countQuery += `AND s.is_active = true`;
    }
    if (status === "inactive") {
      query += ` AND s.is_active = false`;
      countQuery += ` AND s.is_active = false`;
    }

    if (search) {
      params.push(`%${search}%`);

      query += `
    AND (
      s.service_name ILIKE $${params.length}
      OR s.description ILIKE $${params.length}
      OR l.name ILIKE $${params.length}
      OR l.city ILIKE $${params.length}
    )
  `;

      countQuery += `
    AND (
      s.service_name ILIKE $${params.length}
      OR s.description ILIKE $${params.length}
      OR l.name ILIKE $${params.length}
      OR l.city ILIKE $${params.length}
    )
  `;
    }

    query += ` ORDER BY l.name, s.service_name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const [result, countResult] = await Promise.all([
      pool.query(query, [...params, limit, offset]),
      pool.query(countQuery, params),
    ]);

    const total = Number(countResult.rows[0].count);

    return res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        s.*,
        l.name  AS location_name,
        l.city  AS location_city,
        l.state AS location_state,
        l.phone AS location_phone,
        l.email AS location_email
       FROM services s
       JOIN locations l ON s.location_id = l.location_id
       WHERE s.service_id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createService = async (req, res) => {
  try {
    const { location_id, service_name, description, avg_service_time } =
      req.body;

    if (!location_id || !service_name) {
      return res.status(400).json({
        success: false,
        message: "location_id and service_name are required",
      });
    }

    // Verify location exists and is active
    const locationCheck = await pool.query(
      `SELECT location_id FROM locations WHERE location_id = $1 AND is_active = true`,
      [location_id],
    );

    if (locationCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Location not found or inactive",
      });
    }

    const result = await pool.query(
      `INSERT INTO services (location_id, service_name, description, avg_service_time, is_active)
       VALUES ($1,$2,$3,$4,true)
       RETURNING *`,
      [location_id, service_name, description, avg_service_time || null],
    );

    return res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: result.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { service_name, description, avg_service_time, is_active } = req.body;

    const result = await pool.query(
      `UPDATE services
       SET
         service_name     = COALESCE($1, service_name),
         description      = COALESCE($2, description),
         avg_service_time = COALESCE($3, avg_service_time),
         is_active        = COALESCE($4, is_active)
       WHERE service_id = $5
       RETURNING *`,
      [service_name, description, avg_service_time, is_active, id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE services SET is_active = false WHERE service_id = $1 RETURNING *`,
      [id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Service deactivated",
      data: result.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getServiceQueues = async (req, res) => {
  try {
    const { id } = req.params;
    const today = new Date().toISOString().split("T")[0];

    const result = await pool.query(
      `SELECT
        q.*,
        COUNT(t.token_id)                                          AS total_tokens,
        COUNT(CASE WHEN t.status = 'waiting'   THEN 1 END)        AS waiting,
        COUNT(CASE WHEN t.status = 'serving'   THEN 1 END)        AS serving,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END)        AS completed
       FROM queues q
       LEFT JOIN tokens t ON q.queue_id = t.queue_id
       WHERE q.service_id = $1
         AND q.queue_date = $2
       GROUP BY q.queue_id`,
      [id, today],
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
