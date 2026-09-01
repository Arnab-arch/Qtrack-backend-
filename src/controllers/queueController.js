import { Socket } from "dgram";
import pool from "../config/db.js";
import { getAvgServiceSeconds } from "../helpers/timeEstimation.js";
import {estimateQueueWait} from "../helpers/timeEstimation.js"

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
      [service_id, today, "open"]
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

export const getQueuesBrowse = async (req, res) => {
  try {
    const { city, state, search, date } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const queueDate = date || new Date().toISOString().split("T")[0];

    const params = [queueDate];
    let where = `WHERE q.queue_date = $1`;

    if (city) {
      params.push(city);
      where += ` AND LOWER(l.city) = LOWER($${params.length})`;
    }
    if (state) {
      params.push(state);
      where += ` AND LOWER(l.state) = LOWER($${params.length})`;
    }
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      where += ` AND (LOWER(s.service_name) LIKE $${params.length} OR LOWER(l.name) LIKE $${params.length} OR LOWER(l.city) LIKE $${params.length})`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM queues q
       JOIN services s ON q.service_id = s.service_id
       JOIN locations l ON s.location_id = l.location_id
       ${where}`,
      params
    );

    const query = `
      SELECT
        q.queue_id, q.service_id, q.status, q.queue_date,
        s.service_name, s.avg_service_time,
        l.location_id, l.name AS location_name, l.city, l.state,
        COUNT(t.token_id) FILTER (WHERE t.status IN ('waiting','serving')) AS waiting
      FROM queues q
      JOIN services s ON q.service_id = s.service_id
      JOIN locations l ON s.location_id = l.location_id
      LEFT JOIN tokens t ON q.queue_id = t.queue_id
      ${where}
      GROUP BY q.queue_id, s.service_id, l.location_id
      ORDER BY l.name, s.service_name
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const result = await pool.query(query, [...params, limit, offset]);

    // Estimated wait per queue: waiting count x avg service time for that
    // service (uses real history once enough completed tokens exist).
    const data = await Promise.all(
      result.rows.map(async (row) => {
        const avgSeconds = await getAvgServiceSeconds(row.service_id);
        const waiting = Number(row.waiting);
        return {
          queue_id: row.queue_id,
          service_id: row.service_id,
          service_name: row.service_name,
          location_id: row.location_id,
          location_name: row.location_name,
          city: row.city,
          state: row.state,
          status: row.status, // 'open' | 'paused' | 'closed'
          queue_date: row.queue_date,
          waiting,
          estimatedWaitMinutes: Math.round((waiting * avgSeconds) / 60),
        };
      })
    );

    const total = Number(countResult.rows[0].count);

    return res.status(200).json({
      success: true,
      count: data.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
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

    const allowed = ["open", "paused", "closed"];

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
    const { email, phone, user_lat, user_lon, user_address } = req.body;

    const queueCheck = await pool.query(
      `SELECT * FROM queues
       WHERE queue_id = $1
       AND status = 'open'`,
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
       (queue_id, user_id, token_number, email, phone, status, user_lat, user_lon, user_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [id, user_id, nextToken, email, phone, "waiting", user_lat || null, user_lon || null, user_address || null]
    );
    const io = req.app.get("io")
    io.to(`queue_${id}`).emit("queue_updated" ,{
      event:"token-joined",
      token:token.rows[0]
    })

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

export const getQueuesByService = async(req,res)=>{
  try{
    const {service_id}= req.params ;

    const result = await pool.query(
  `SELECT * FROM queues WHERE service_id = $1 AND status = 'open' ORDER BY queue_date DESC`,
  [service_id]
);
    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  }catch(err){
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

export const callNextToken = async (req, res) => {
  try {
    const { id } = req.params;

    const servingToken = await pool.query(`SELECT * FROM tokens WHERE queue_id=$1 AND status='serving'`,[id])
    if (servingToken.rows.length > 0){
      return res.status(400).json({
        success:false,
        message:"current token must be completed first"
      });
    }

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
    const eta = estimateQueueWait(id);
    const io = req.app.get("io");
    io.to(`queue_${id}`).emit("queue_updated",{
      event:"token-called",
      token:updated.rows[0],
      eta,
    });

    io.to(`user_${updated.rows[0].user_id}`).emit("yourTurn",{
      token_id:updated.rows[0].token_id,
      token_number:updated.rows[0].token_number ,
      queue_id:id,

    })




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

export const Tokenserved = async(req,res) =>{
  try{
    const {id} = req.params;

    const result = await pool.query(`UPDATE tokens
SET
  status = 'completed',
  served_at = NOW()
WHERE queue_id = $1
AND status = 'serving'
RETURNING *`,[id]);

if (result.rows.length === 0){
  return res.status(404).json({
    success: false,
    message: "No serving token found"
  });
}

const io = req.app.get("io")
io.to(`queue_${id}`).emit("queue_updated" , {
  event:"token-completed",
  token:result.rows[0]
})


    return res.status(200).json({
      success:true,
      message:"token served"
    })
  }catch(err){
    return res.status(500).json({
      success:false,
      message:err.message,
    });
  }
}


