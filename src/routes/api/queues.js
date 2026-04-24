import express from "express";
import pool from "../../config/db.js";
import { Authmiddleware,Authroles } from "../../middleware/authMiddleware.js";

const router = express.Router();

// CREATE i will POST queueus here to any users joining a queueu simple
// we asve a new queue to the db and send back the create queueu
// writing and creating data needs authentication someone who is loggin in and has access can do this stuff
// just check if the queueuid and date is validated // suggestion i should add to check if its todays date queueu
// add the queue request to the queueue table
//return the result
router.post("/", Authmiddleware, async (req, res) => {
  try {
    const { service_id } = req.body;
    if (!service_id) {
      return res.status(400).json({
        success: false,
        message: "service_id is required",
      });
    }

    const today = new Date();
    const formatdate = today.toISOString().split("T")[0];

    const result = await pool.query(
      `INSERT INTO queues (service_id,queue_date,status)
            VALUES ($1,$2,$3)
            RETURNING *`,
      [service_id, formatdate, "active"],
    );

    return res.status(201).json({
      success: true,
      message: "queue created suuccesffully",
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
});

router.get("/queues", async (req, res) => {
  try {
    const { date } = req.query;

    let result;
    if (date) {
      result = await pool.query(
        `SELECT * FROM queues WHERE DATE(queue_date) = $1
                ORDER BY queue_date DESC `,
        [date],
      );
      return res.status(200).json({
        success: true,
        message: `queues displayed for ${queue_date}`,
        data: result.rows,
      });
    } else {
      result = await pool.query(
        `SELECT * FROM queues ORDER BY queue_date DESC`,
      );
      return res.status(200).json({
        success: true,
        message: " All existing queues",
        data: result.rows,
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/queues/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(403).json({
        success: false,
        message: "queue not valid",
      });
    }

    const result = await pool.query(`SELECT 
            q.queue_id,
            q.service_id,
            q.queue_date,
            q.status,

            
            ARRAY_REMOVE(ARRAY_AGG(t.token_number), NULL) AS tokens

            COUNT(t.token_id) AS total_tokens

            COUNT(CASE WHEN t.status = 'waiting' THEN 1 END) AS waiting_tokens,
            COUNT(CASE WHEN t.status = 'served' THEN 1 END) AS served_tokens
            FROM queues q
            LEFT JOIN tokens t

             ON q.queue_id = t.queue_id
            WHERE queue_id=$1
            GROUP BY q.queue_id,q.service_id,q.queue_date,
            q.status ;`,[id]);

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
});

router.patch("/queue/:id",Authmiddleware ,Authroles("staff","admin"),async(req,res)=>{
    try{
        const {id} = req.params ;
        const{status}= req.body ;
        const allowedstatus = ["active","paused","closed"];

        if(!allowedstatus.includes(status)){
            return res.status(400).json({
                success:false,
                message:"invalid status"
            })
        }

        const result = await pool.query(`UPDATE queues 
            SET status = $1,
            WHERE queue_id=$2
            RETURNING *`,[status,id])

        if (result.rows.length===0){
            return res.status(404).json({
                success:false,
                message:"queue not found"
            });
        }

        return res.status(200).json({
            success:true ,
            message:"QUEUE UPDATED SUCCESFULLY",
            data:result.rows[0],
        });
    }catch(err){
        return res.status(500).json({
        success: false,
        message: err.message,
      });
    }

})

router.delete("/queue/:id",Authmiddleware ,Authroles("staff","admin"),async(req,res)=>{
    try{
        const {id} = req.params ;

        if(!id){
            return res.status(400).json({
                success:false,
                message:"invalid status"
            });
        }

        const result = await pool.query(`DELETE FROM  queues 
            WHERE queue_id=$1
            RETURNING *`,[id])

        if (result.rows.length===0){
            return res.status(404).json({
                success:false,
                message:"queue not found"
            });
        }

        return res.status(200).json({
            success:true ,
            message:"QUEUE DELETED SUCCESFULLY",
            data:result.rows[0],
        });
    }catch(err){
        return res.status(500).json({
        success: false,
        message: err.message,
      });
    }

})