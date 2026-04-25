import dotenv from "dotenv";
dotenv.config();

import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import {
  isValidemail,
  isValidpassword,
  inputsanitize,
} from "../utils/validation.js";
import { ROLES, isValidRole } from "../config/roles.js";
import bcrypt, { hash } from "bcryptjs";



export const register = async (req, res) => {
  try {
    const { name, email, password, role ,phone} = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "enter the required feilds",
      });
    }
    if (!isValidemail(email)) {
      return res.status(403).json({
        success: false,
        message: " enter the valid email",
      });
    }

    if (!isValidpassword(password)) {
      return res.status(403).json({
        success: false,
        message: " enter the valid password",
      });
    }
    const userRole = role && isValidRole(role) ? role : ROLES.VISITOR;

    const userexist = await pool.query(`SELECT * FROM users WHERE email=$1`, [
      email.toLowerCase(),
    ]);

    if (userexist.rows.length > 0) {
      return res.status(403).json({
        success: false,
        message: "user already exists",
      });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    const result = await pool.query(
      `INSERT  INTO users (name ,email,password_hash,phone,role,is_active)
    VALUES($1,$2,$3,$4,$5,$6)
    RETURNING user_id ,name,email,phone,role,created_at `,
      [name, email.toLowerCase(), hash, phone, userRole, true],
    );

    const user = result.rows[0];
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: user,
    });
  } catch (err) {
    console.error("registration error", err);
    return res.status(500).json({
      success: false,
      error: err.message ,
    });
  }
};

// login

export const login = async (req, res) => {
  try {
    const {email, password} = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "required feilds missing ",
      });
    }
    const current = await pool.query(`SELECT * FROM users WHERE email=$1`, [
      email.toLowerCase(),

    ]);

    if (!current) {
      return res.status(403).json({
        success: false,
        message: "user does not exist",
      });
    }

    const user = current.rows[0];

    const passwordmatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordmatch) {
      return res.status(403).json({
        success: false,
        message: "incorrect password",
      });
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );
    return res.json({
      success: true,
      message: "Login successful",
      token: token,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("login error", err);
    return res.status(500).json({
      success: false,
      error: err.message ,
    });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT user_id, full_name, email, phone, role, created_at FROM users WHERE user_id = $1 AND is_active = true",
      [req.user.user_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    return res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (err) {
    console.error("get current user error", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
