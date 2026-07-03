import pool from "../config/db.js"
import { haversineKm } from "../utils/distance.js";
export const getLocations = async (req ,res) =>{
    try{
        const {city,state} = req.query ;

        let query = `SELECT * FROM locations WHERE is_active = true`
        const params = []

        if (city){
            params.push(city)
            query += ` AND LOWER(city) = LOWER($${params.length})`;
        }
        if (state){
            params.push(state)
            query += ` AND LOWER(state) = LOWER($${params.length})`;
        }
        query += ` ORDER BY name ASC`;

        const result = await pool.query(query,params);

        return res.status(200).json({
            success:true,
            count : result.rows.length ,
            data : result.rows
        })

    }catch(err){
        return res.status(500).json({ success: false, message: err.message });
    }
}


export const getLocationById = async (req,res) =>{
    try{
            const {id} = req.params ;

    const result = await pool.query(`SELECT * FROM locations WHERE location_id=$1`,[id]);

    if (result.rows.length===0){
        return res.status(404).json({success:false ,message : "Location not found "})
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
    }catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }

}
// manual
export const createLocation = async (req, res) => {
  try {
    const { name, address, city, state, phone, email } = req.body;

    if (!name || !address || !city || !state) {
      return res.status(400).json({
        success: false,
        message: "name, address, city and state are required",
      });
    }

    const result = await pool.query(
      `INSERT INTO locations (name, address, city, state, phone, email, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,true)
       RETURNING *`,
      [name, address, city, state, phone || null, email || null]
    );

    return res.status(201).json({
      success: true,
      message: "Location created successfully",
      data: result.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// with Nominatim 
export const createLocationFromSearch = async (req, res) => {
  try {
    const { display_name, lat, lon, phone, email, name: customName } = req.body;

    if (!display_name || !lat || !lon) {
      return res.status(400).json({
        success: false,
        message: "display_name, lat, and lon are required (from Nominatim result)",
      });
    }


    const parts = display_name.split(",").map((p) => p.trim());

    const name = customName || parts[0];
    const address = parts.slice(0, -3).join(", "); 
    const state = parts[parts.length - 2] || "";
    const city = parts[parts.length - 3] || "";

    if (!name || !city || !state) {
      return res.status(400).json({
        success: false,
        message: "Could not parse city/state from display_name. Please add manually.",
      });
    }

    const result = await pool.query(
      `INSERT INTO locations (name, address, city, state, phone, email, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,true)
       RETURNING *`,
      [name, address, city, state, phone || null, email || null]
    );

    return res.status(201).json({
      success: true,
      message: "Location created from search result",
      data: result.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


// GET /locations/search?q=hospital+in+chennai
export const searchLocationByName = async (req,res)=>{
    try{
        const {q} = req.query ;
    if (!q){
      return res.status(400).json({ success: false, message: "Query param 'q' is required" });  
    }

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=10`

    const response = await fetch (url,{
        headers:{
            "User-Agent" :"Qtrack/1.0 (queue-management-app)",
        },
    });

    if (!response.ok){
        return res.status(502).json({success:false , message:"Nominatim API error"});
    }
    const data = await response.json();
    const suggestions = data.map((item) => ({
      place_id: item.place_id,
      display_name: item.display_name,
      lat: item.lat,
      lon: item.lon,
      city:
        item.address?.city ||
        item.address?.town ||
        item.address?.village ||
        item.address?.county ||
        "",
      state: item.address?.state || "",
      country: item.address?.country || "",
    }));

     return res.status(200).json({ success: true, count: suggestions.length, data: suggestions });

    }catch(err){
         return res.status(500).json({ success: false, message: err.message });
    }    
};

export const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, city, state, phone, email, is_active } = req.body;

    const result = await pool.query(
      `UPDATE locations
       SET
         name      = COALESCE($1, name),
         address   = COALESCE($2, address),
         city      = COALESCE($3, city),
         state     = COALESCE($4, state),
         phone     = COALESCE($5, phone),
         email     = COALESCE($6, email),
         is_active = COALESCE($7, is_active)
       WHERE location_id = $8
       RETURNING *`,
      [name, address, city, state, phone, email, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Location not found" });
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE locations SET is_active = false WHERE location_id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Location not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Location deactivated",
      data: result.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


export const distancecal = async(req,res)=>{
  try{
    const {id}= req.params;
    const {user_lat,user_lon} = req.body;
    if (!user_lat || !user_lon){
      return res.status(400).json({
        success:false,
        message:"user coordinates cannot be detected"
      })
    }
    const result = await pool.query(`SELECT location_id name,latitude ,longitude FROM locations WHERE location_id=$1`,[id]);

    if (result.rows.length === 0){
      return res.status.json({
        success:false,
        message:"service location not found"
      });
    }

    const location = result.rows[0];

    const distancekm = haversineKm(Number(user_lat),Number(user_lon),
  Number(location.latitude),Number(location.longitude));

  const etaMinutes = Math.round((distancekm/30)*60);

  return res.status(200).json({
      success: true,
      data: {
        locationId: location.location_id,
        locationName: location.name,
        distancekm: Number(distancekm.toFixed(2)),
        etaMinutes,
      },
    });
  }catch(err){
    return res.status(500).json({
      success:false,
      message:err.message,
    });
  }
}