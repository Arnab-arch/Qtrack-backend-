import pool from "../config/db.js";
import { haversineKm } from "../utils/distance.js";

const AVG_SPEED_KMH = 30; // matches locationController.distancecal assumption


export const getAvgServiceSeconds = async (serviceId) => {
  const historyResult = await pool.query(
    `SELECT AVG(EXTRACT(EPOCH FROM (t.served_at - t.called_at))) AS avg_seconds,
            COUNT(*) AS sample_size
     FROM tokens t
     JOIN queues q ON t.queue_id = q.queue_id
     WHERE q.service_id = $1
       AND t.status = 'completed'
       AND t.called_at IS NOT NULL
       AND t.served_at IS NOT NULL`,
    [serviceId]
  );

  const { avg_seconds, sample_size } = historyResult.rows[0];

  // Require a minimum sample size before trusting live history over the
  // configured estimate, otherwise one unusually slow/fast token skews it.
  if (avg_seconds && Number(sample_size) >= 5) {
    return Number(avg_seconds);
  }

  const serviceResult = await pool.query(
    `SELECT avg_service_time FROM services WHERE service_id = $1`,
    [serviceId]
  );

  const fallbackMinutes = serviceResult.rows[0]?.avg_service_time;
  return fallbackMinutes ? Number(fallbackMinutes) * 60 : 300; // default 5 min
};

/**
 * Estimated wait for a specific token: how many people are still ahead of
 * it (waiting or currently being served), multiplied by avg service time.
 */
export const estimateTokenWait = async (tokenId) => {
  const tokenResult = await pool.query(
    `SELECT t.token_id, t.token_number, t.status, t.queue_id,
            t.user_lat, t.user_lon,
            q.service_id,
            l.latitude AS location_lat, l.longitude AS location_lon
     FROM tokens t
     JOIN queues q ON t.queue_id = q.queue_id
     JOIN services s ON q.service_id = s.service_id
     JOIN locations l ON s.location_id = l.location_id
     WHERE t.token_id = $1`,
    [tokenId]
  );

  if (tokenResult.rows.length === 0) return null;

  const token = tokenResult.rows[0];

  if (token.status === "completed" || token.status === "no_show") {
    return { position: 0, etaMinutes: 0, status: token.status };
  }

  const aheadResult = await pool.query(
    `SELECT COUNT(*) AS ahead
     FROM tokens
     WHERE queue_id = $1
       AND status IN ('waiting','serving')
       AND token_number < $2`,
    [token.queue_id, token.token_number]
  );

  const position = Number(aheadResult.rows[0].ahead);
  const avgSeconds = await getAvgServiceSeconds(token.service_id);
  const etaMinutes = Math.round((position * avgSeconds) / 60);

  const result = {
    position,
    etaMinutes,
    avgServiceMinutes: Math.round(avgSeconds / 60),
    status: token.status,
  };

  // Only computable if the user shared their location when joining

  const hasUserCoords = token.user_lat != null && token.user_lon != null;
  const hasLocationCoords = token.location_lat != null && token.location_lon != null;

  if (hasUserCoords && hasLocationCoords) {
    const distanceKm = haversineKm(
      Number(token.user_lat),
      Number(token.user_lon),
      Number(token.location_lat),
      Number(token.location_lon)
    );
    const travelEtaMinutes = Math.round((distanceKm / AVG_SPEED_KMH) * 60);

    result.distanceKm = Number(distanceKm.toFixed(2));
    result.travelEtaMinutes = travelEtaMinutes;
    // How long the person can still wait before they need to leave in
    // order to arrive right when their turn comes up.
    result.leaveInMinutes = Math.max(0, etaMinutes - travelEtaMinutes);
  }

  return result;
};


export const estimateQueueWait = async (queueId) => {
  const queueResult = await pool.query(
    `SELECT service_id FROM queues WHERE queue_id = $1`,
    [queueId]
  );
  if (queueResult.rows.length === 0) return null;

  const { service_id } = queueResult.rows[0];

  const countResult = await pool.query(
    `SELECT COUNT(*) AS waiting
     FROM tokens
     WHERE queue_id = $1 AND status IN ('waiting','serving')`,
    [queueId]
  );

  const waiting = Number(countResult.rows[0].waiting);
  const avgSeconds = await getAvgServiceSeconds(service_id);
  const etaMinutes = Math.round((waiting * avgSeconds) / 60);

  return { waiting, etaMinutes, avgServiceMinutes: Math.round(avgSeconds / 60) };
};


export const getTokenEta = async (req, res) => {
  try {
    const { id } = req.params;
    const eta = await estimateTokenWait(id);

    if (!eta) {
      return res.status(404).json({ success: false, message: "Token not found" });
    }

    return res.status(200).json({ success: true, data: eta });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getQueueEta = async (req, res) => {
  try {
    const { id } = req.params;
    const eta = await estimateQueueWait(id);

    if (!eta) {
      return res.status(404).json({ success: false, message: "Queue not found" });
    }

    return res.status(200).json({ success: true, data: eta });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};