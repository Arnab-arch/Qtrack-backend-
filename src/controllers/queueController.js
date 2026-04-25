import pool from "../config/db.js";

export const createQueue = async (req, res) => {
  try {
    const { service_id } = req.body;

    if (!service_id) {
      return res.status(400).json({
        success: false,
        message: "service_id is required",
      });
    }

    const today = new Date().toISOString().split("T")[0];

    const result = await pool.query(
      `INSERT INTO queues (service_id, queue_date, status)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [service_id, today, "active"]
    );

    return res.status(201).json({
      success: true,
      message: "Queue created successfully",
      data: result.rows[0],
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Queue already exists for this service today",
      });
    }

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getQueues = async (req, res) => {
  try {
    const { date } = req.query;

    let result;

    if (date) {
      result = await pool.query(
        `SELECT * FROM queues
         WHERE queue_date = $1
         ORDER BY queue_date DESC`,
        [date]
      );
    } else {
      result = await pool.query(
        `SELECT * FROM queues
         ORDER BY queue_date DESC`
      );
    }

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getQueueById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        q.queue_id,
        q.service_id,
        q.queue_date,
        q.status,
        ARRAY_REMOVE(ARRAY_AGG(t.token_number), NULL) AS tokens,
        COUNT(t.token_id) AS total_tokens,
        COUNT(CASE WHEN t.status = 'waiting' THEN 1 END) AS waiting_tokens,
        COUNT(CASE WHEN t.status = 'serving' THEN 1 END) AS serving_tokens
      FROM queues q
      LEFT JOIN tokens t
        ON q.queue_id = t.queue_id
      WHERE q.queue_id = $1
      GROUP BY q.queue_id, q.service_id, q.queue_date, q.status`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Queue not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const updateQueueStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["active", "paused", "closed"];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const result = await pool.query(
      `UPDATE queues
       SET status = $1
       WHERE queue_id = $2
       RETURNING *`,
      [status, id]
    );

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const deleteQueue = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM queues
       WHERE queue_id = $1
       RETURNING *`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const joinQueue = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.user;
    const { email, phone } = req.body;

    const queueCheck = await pool.query(
      `SELECT * FROM queues
       WHERE queue_id = $1
       AND status = 'active'`,
      [id]
    );

    if (queueCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Queue not active",
      });
    }

    const existing = await pool.query(
      `SELECT * FROM tokens
       WHERE queue_id = $1
       AND user_id = $2
       AND status IN ('waiting','serving')`,
      [id, user_id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Already in queue",
      });
    }

    const lastToken = await pool.query(
      `SELECT MAX(token_number) FROM tokens WHERE queue_id = $1`,
      [id]
    );

    const nextToken = (lastToken.rows[0].max || 0) + 1;

    const token = await pool.query(
      `INSERT INTO tokens
       (queue_id, user_id, token_number, email, phone, status)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [id, user_id, nextToken, email, phone, "waiting"]
    );

    return res.status(201).json({
      success: true,
      data: token.rows[0],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const callNextToken = async (req, res) => {
  try {
    const { id } = req.params;

    const nextToken = await pool.query(
      `SELECT *
       FROM tokens
       WHERE queue_id = $1
       AND status = 'waiting'
       ORDER BY token_number ASC
       LIMIT 1`,
      [id]
    );

    if (nextToken.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No waiting token",
      });
    }

    const tokenId = nextToken.rows[0].token_id;

    const updated = await pool.query(
      `UPDATE tokens
       SET status = $1,
           called_at = NOW()
       WHERE token_id = $2
       RETURNING *`,
      ["serving", tokenId]
    );

    return res.status(200).json({
      success: true,
      data: updated.rows[0],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getQueueStats = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'waiting' THEN 1 END) AS waiting,
        COUNT(CASE WHEN status = 'serving' THEN 1 END) AS serving,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed,
        COUNT(CASE WHEN status = 'no_show' THEN 1 END) AS no_show
      FROM tokens
      WHERE queue_id = $1`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};