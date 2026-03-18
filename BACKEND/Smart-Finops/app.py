from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import hashlib
import json
from datetime import datetime
import jwt
from web3 import Web3

# ---------------- CONFIG ----------------

SECRET_KEY = "my_super_secret_key_123"
DATABASE = "db.sqlite3"

app = Flask(__name__)
CORS(app)

# ---------------- BLOCKCHAIN ----------------

w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))

contract_address = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"

with open("AuditAnchorABI.json") as f:
    abi = json.load(f)

contract = w3.eth.contract(address=contract_address, abi=abi)

print("Blockchain connected:", w3.is_connected())

# ---------------- DB ----------------

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("CREATE TABLE IF NOT EXISTS roles (id INTEGER PRIMARY KEY, name TEXT)")
    cur.execute("CREATE TABLE IF NOT EXISTS departments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)")

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

    cur.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT,
        data TEXT,
        previous_hash TEXT,
        current_hash TEXT,
        timestamp TEXT
    )
    """)

    # ✅ CREATE ADMIN BEFORE CLOSE
    cur.execute("SELECT * FROM users WHERE role_id = 1")
    admin = cur.fetchone()

    if not admin:
        cur.execute("""
            INSERT INTO users (name, password, role_id, department_id)
            VALUES (?, ?, ?, ?)
        """, ("admin", hash_password("admin123"), 1, 1))

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

def generate_hash(data, prev):
    block = json.dumps(data, sort_keys=True) + prev
    return hashlib.sha256(block.encode()).hexdigest()

# ---------------- AUTH ----------------

@app.route("/register", methods=["POST"])
def register():
    data = request.json

    if data.get("role_id") != 4:
        return jsonify({"error": "Only vendors can register"}), 403

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO users (name, password, role_id, department_id)
        VALUES (?, ?, ?, ?)
    """, (data["name"], hash_password(data["password"]), 4, 1))

    conn.commit()
    conn.close()

    return jsonify({"message": "Vendor registered"})

@app.route("/login", methods=["POST"])
def login():
    data = request.json

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT u.*, r.name as role
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.name=? AND u.password=?
    """, (data["name"], hash_password(data["password"])))

    user = cur.fetchone()
    conn.close()

    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    token = generate_token(user["id"], user["role"])

    return jsonify({"token": token, "role": user["role"], "user_id": user["id"]})

# ---------------- TRANSACTIONS ----------------

@app.route("/request_transaction", methods=["POST"])
def request_tx():
    data = request.json

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO transactions (user_id, department_id, amount, status, timestamp)
        VALUES (?, ?, ?, ?, ?)
    """, (data["user_id"], data["department_id"], data["amount"], "pending", datetime.now()))

    conn.commit()
    conn.close()

    return jsonify({"status": "pending"})

@app.route("/approve_transaction", methods=["POST"])
def approve_tx():
    data = request.json
    tx_id = data["transaction_id"]

    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT * FROM transactions WHERE id=?", (tx_id,))
    tx = cur.fetchone()

    cur.execute("UPDATE transactions SET status='approved' WHERE id=?", (tx_id,))

    # Blockchain + Hash
    cur.execute("SELECT current_hash FROM audit_logs ORDER BY id DESC LIMIT 1")
    prev = cur.fetchone()
    prev_hash = prev["current_hash"] if prev else "0"

    log_data = {"tx": tx_id, "amount": tx["amount"]}
    curr_hash = generate_hash(log_data, prev_hash)

    account = w3.eth.accounts[0]
    tx_hash = contract.functions.storeAudit(tx_id, curr_hash).transact({"from": account})
    w3.eth.wait_for_transaction_receipt(tx_hash)

    cur.execute("""
        INSERT INTO audit_logs (action, data, previous_hash, current_hash, timestamp)
        VALUES (?, ?, ?, ?, ?)
    """, ("approved", json.dumps(log_data), prev_hash, curr_hash, datetime.now()))

    conn.commit()
    conn.close()

    return jsonify({"status": "approved"})

@app.route("/list_transactions")
def list_tx():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM transactions")
    data = [dict(row) for row in cur.fetchall()]
    conn.close()
    return jsonify(data)

# ---------------- USERS ----------------

@app.route("/create_user", methods=["POST"])
def create_user():
    user = verify_token(request)
    if not user or user["role"] != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    data = request.json

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO users (name, password, role_id, department_id)
        VALUES (?, ?, ?, ?)
    """, (data["name"], hash_password(data["password"]), data["role_id"], data["department_id"]))

    conn.commit()
    conn.close()

    return jsonify({"message": "User created"})

@app.route("/list_users")
def list_users():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users")
    data = [dict(row) for row in cur.fetchall()]
    conn.close()
    return jsonify(data)

@app.route("/delete_user/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM users WHERE id=?", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Deleted"})

# ---------------- DEPARTMENTS ----------------

@app.route("/create_department", methods=["POST"])
def create_department():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("INSERT INTO departments (name) VALUES (?)", (request.json["name"],))
    conn.commit()
    conn.close()
    return jsonify({"message": "Created"})

@app.route("/list_departments")
def list_departments():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM departments")
    data = [dict(row) for row in cur.fetchall()]
    conn.close()
    return jsonify(data)

@app.route("/delete_department/<int:dept_id>", methods=["DELETE"])
def delete_department(dept_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM departments WHERE id=?", (dept_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Deleted"})

# ---------------- BLOCKCHAIN ----------------

@app.route("/audit_logs")
def audit_logs():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM audit_logs")
    data = [dict(row) for row in cur.fetchall()]
    conn.close()
    return jsonify(data)

@app.route("/verify_chain")
def verify_chain():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM audit_logs ORDER BY id ASC")
    logs = cur.fetchall()

    prev = "0"
    for log in logs:
        data = json.loads(log["data"])
        if generate_hash(data, prev) != log["current_hash"]:
            return jsonify({"status": "tampered"})
        prev = log["current_hash"]

    return jsonify({"status": "valid"})

# ---------------- RUN ----------------

if __name__ == "__main__":
    init_db()
    seed_roles()
    app.run(debug=True)