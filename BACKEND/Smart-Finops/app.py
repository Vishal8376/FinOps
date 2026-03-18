from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import hashlib
import json
from datetime import datetime
import jwt

# ---------------- CONFIG ----------------

SECRET_KEY = "supersecretkey"

app = Flask(__name__)
CORS(app)

DATABASE = "db.sqlite3"

# ---------------- DB ----------------

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("CREATE TABLE IF NOT EXISTS roles (id INTEGER PRIMARY KEY, name TEXT)")
    cur.execute("CREATE TABLE IF NOT EXISTS departments (id INTEGER PRIMARY KEY, name TEXT)")
    
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        password TEXT,
        role_id INTEGER,
        department_id INTEGER
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        department_id INTEGER,
        total_budget REAL,
        used_budget REAL DEFAULT 0
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        department_id INTEGER,
        amount REAL,
        status TEXT,
        reason TEXT,
        timestamp TEXT
    )
    """)

    conn.commit()
    conn.close()

def seed_roles():
    conn = get_db()
    cur = conn.cursor()
    roles = [(1,"admin"),(2,"manager"),(3,"employee"),(4,"vendor")]
    for r in roles:
        try:
            cur.execute("INSERT INTO roles VALUES (?,?)", r)
        except:
            pass
    conn.commit()
    conn.close()

# ---------------- SECURITY ----------------

def hash_password(p):
    return hashlib.sha256(p.encode()).hexdigest()

def generate_token(uid, role):
    return jwt.encode({"user_id": uid, "role": role}, SECRET_KEY, algorithm="HS256")

def verify_token(req):
    token = req.headers.get("Authorization")
    if not token:
        return None
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except:
        return None

# ---------------- AUTH ----------------

@app.route("/register", methods=["POST"])
def register():
    data = request.json

    if data.get("role_id") != 4:
        return jsonify({"error": "Only vendor allowed"}), 403

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO users (name, password, role_id, department_id)
        VALUES (?, ?, ?, ?)
    """, (
        data["name"],
        hash_password(data["password"]),
        4,
        data.get("department_id", 1)
    ))

    conn.commit()
    conn.close()

    return jsonify({"message": "Vendor registered"})

@app.route("/login", methods=["POST"])
def login():
    data = request.json

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT users.*, roles.name as role
        FROM users JOIN roles ON users.role_id = roles.id
        WHERE name=? AND password=?
    """, (data["name"], hash_password(data["password"])))

    user = cur.fetchone()
    conn.close()

    if not user:
        return jsonify({"error": "Invalid"}), 401

    token = generate_token(user["id"], user["role"])

    return jsonify({
        "token": token,
        "role": user["role"]
    })

# ---------------- ADMIN CREATE ----------------

@app.route("/admin/create_user", methods=["POST"])
def admin_create():
    user = verify_token(request)
    if not user or user["role"] != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    data = request.json

    if data["role_id"] not in [2,3]:
        return jsonify({"error": "Only manager/employee allowed"}), 403

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO users (name, password, role_id, department_id)
        VALUES (?, ?, ?, ?)
    """, (
        data["name"],
        hash_password(data["password"]),
        data["role_id"],
        data["department_id"]
    ))

    conn.commit()
    conn.close()

    return jsonify({"message": "User created"})

# ---------------- RUN ----------------

if __name__ == "__main__":
    init_db()
    seed_roles()
    app.run(debug=True)