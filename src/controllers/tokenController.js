import pool from "../config/db.js";

export const getMyTokens = async (req, res) => {
  try {
    const { user_id } = req.user;

    const result = await pool.query(
      `SELECT
        t.token_id,
        t.token_number,
        t.status,
        q.queue_id,
        q.queue_date
      FROM tokens t
      JOIN queues q
        ON t.queue_id = q.queue_id
      WHERE t.user_id = $1`,
      [user_id]
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const updateTokenStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    let result;

    if (status === "completed") {
      result = await pool.query(
        `UPDATE tokens
         SET status = $1,
             served_at = NOW()
         WHERE token_id = $2
         RETURNING *`,
        [status, id]
      );
    } else {
      result = await pool.query(
        `UPDATE tokens
         SET status = $1
         WHERE token_id = $2
         RETURNING *`,
        [status, id]
      );
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};