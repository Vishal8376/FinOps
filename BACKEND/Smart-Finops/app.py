from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import hashlib
import json
from datetime import datetime
import jwt
from web3 import Web3
import os
import traceback

# ---------------- CONFIG ----------------

SECRET_KEY = "my_super_secret_key_123"
DATABASE = "db.sqlite3"

app = Flask(__name__)
CORS(app)

# ---------------- BLOCKCHAIN ----------------

w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))

contract_address = "0x5FbDB2315678afecb367f032d93F642f64180aa3"

contract = None
try:
    abi_path = os.path.join(os.path.dirname(__file__), "AuditAnchorABI.json")
    with open(abi_path, "r", encoding="utf-8") as f:
        abi = json.load(f)
    contract = w3.eth.contract(address=contract_address, abi=abi)
    print("[finops] Blockchain connected:", w3.is_connected())
except Exception as e:
    # Never crash the API if blockchain is unavailable.
    print("[finops] Blockchain init failed:", str(e))

# ---------------- DB ----------------

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def now_iso():
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"

def json_error(message, status_code=400, extra=None):
    payload = {"error": message}
    if extra and isinstance(extra, dict):
        payload.update(extra)
    return jsonify(payload), status_code

def get_json():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}

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
    CREATE TABLE IF NOT EXISTS transaction_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER,
        action TEXT,
        role TEXT,
        user_id INTEGER,
        timestamp TEXT
    )
    """)
    
    cur.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        department_id INTEGER,
        amount REAL,
        status TEXT,
        approver_role TEXT,
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

    # Ensure at least one department exists (admin seed uses department_id=1)
    cur.execute("SELECT id FROM departments ORDER BY id ASC LIMIT 1")
    first_dept = cur.fetchone()
    if not first_dept:
        cur.execute("INSERT INTO departments (name) VALUES (?)", ("General",))

    # Default admin
    cur.execute("SELECT * FROM users WHERE role_id = 1")
    if not cur.fetchone():
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
            cur.execute("INSERT INTO roles (id, name) VALUES (?,?)", r)
        except Exception:
            # role already exists
            continue

    conn.commit()
    conn.close()

# ---------------- SECURITY ----------------

def hash_password(p):
    return hashlib.sha256(str(p or "").encode("utf-8")).hexdigest()

def generate_token(uid, role):
    return jwt.encode({"user_id": uid, "role": role}, SECRET_KEY, algorithm="HS256")

def verify_token(req):
    auth = req.headers.get("Authorization")
    if not auth:
        return None

    token = auth.strip()
    if token.lower().startswith("bearer "):
        token = token[7:].strip()

    if not token:
        return None

    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        if not isinstance(decoded, dict):
            return None
        # Enforce required claims
        if "user_id" not in decoded or "role" not in decoded:
            return None
        return decoded
    except Exception:
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

    # ✅ CHECK IF USER EXISTS
    cur.execute("SELECT * FROM users WHERE name=?", (data["name"],))
    existing_user = cur.fetchone()

    if existing_user:
        conn.close()
        return jsonify({"error": "User already exists"}), 400

    # ✅ CREATE USER
    cur.execute("""
        INSERT INTO users (name, password, role_id, department_id)
        VALUES (?, ?, ?, ?)
    """, (data["name"], hash_password(data["password"]), 4, 1))

    conn.commit()
    conn.close()

    return jsonify({"message": "Vendor registered successfully"})

@app.route("/login", methods=["POST"])
def login():
    try:
        data = get_json()
        name = str(data.get("name") or "").strip()
        password = str(data.get("password") or "")

        if not name or not password:
            return json_error("Missing name or password", 400)

        conn = get_db()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT u.id, u.name, u.password, u.role_id, u.department_id, r.name as role
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.name=? AND u.password=?
            """,
            (name, hash_password(password)),
        )

        user = cur.fetchone()
        conn.close()

        if not user:
            return json_error("Invalid credentials", 401)

        token = generate_token(user["id"], user["role"])
        print(f"[finops] login ok: user_id={user['id']} role={user['role']}")
        return jsonify({"token": token, "role": user["role"], "user_id": user["id"]})
    except Exception as e:
        print("[finops] login error:", str(e))
        return json_error("Invalid request", 400)

# ---------------- ADMIN ----------------
@app.route("/create_user", methods=["POST"])
def create_user():
    user = verify_token(request)
    if not user or user["role"] != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    data = request.json

    conn = get_db()
    cur = conn.cursor()

    # ✅ CHECK EXISTING USER
    cur.execute("SELECT * FROM users WHERE name=?", (data["name"],))
    existing_user = cur.fetchone()

    if existing_user:
        conn.close()
        return jsonify({"error": "User already exists"}), 400

    # ✅ CREATE USER
    cur.execute("""
        INSERT INTO users (name, password, role_id, department_id)
        VALUES (?, ?, ?, ?)
    """, (data["name"], hash_password(data["password"]), data["role_id"], data["department_id"]))

    conn.commit()
    conn.close()

    return jsonify({"message": "User created successfully"})
@app.route("/create_department", methods=["POST"])
def create_department():
    user = verify_token(request)
    if not user or user.get("role") != "admin":
        return json_error("Unauthorized", 403)

    data = get_json()
    name = str(data.get("name") or "").strip()
    if not name:
        return json_error("Missing department name", 400)

    conn = get_db()
    cur = conn.cursor()

    # Optional: prevent duplicates by name
    cur.execute("SELECT id FROM departments WHERE name=?", (name,))
    existing = cur.fetchone()
    if existing:
        conn.close()
        return json_error("Department already exists", 400)

    cur.execute("INSERT INTO departments (name) VALUES (?)", (name,))
    conn.commit()
    conn.close()

    print(f"[finops] department created: {name}")
    return jsonify({"message": "Department created"})

@app.route("/allocate_budget", methods=["POST"])
def allocate_budget():
    user = verify_token(request)
    if not user or user.get("role") != "admin":
        return json_error("Unauthorized", 403)

    data = get_json()
    department_id = data.get("department_id")
    total_budget = data.get("total_budget")

    try:
        department_id = int(department_id)
        total_budget = float(total_budget)
    except Exception:
        return json_error("Invalid department_id or total_budget", 400)

    if total_budget <= 0:
        return json_error("total_budget must be > 0", 400)

    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT id FROM departments WHERE id=?", (department_id,))
    dept = cur.fetchone()
    if not dept:
        conn.close()
        return json_error("Department not found", 404)

    # Upsert budget for department
    cur.execute("SELECT id FROM budgets WHERE department_id=?", (department_id,))
    existing = cur.fetchone()
    if existing:
        cur.execute("UPDATE budgets SET total_budget=? WHERE department_id=?", (total_budget, department_id))
    else:
        cur.execute("INSERT INTO budgets (department_id, total_budget, used_budget) VALUES (?, ?, 0)", (department_id, total_budget))

    conn.commit()
    conn.close()

    print(f"[finops] budget allocated: dept={department_id} total={total_budget}")
    return jsonify({"message": "Budget allocated"})

@app.route("/set_budget", methods=["POST"])
def set_budget():
    user = verify_token(request)
    if not user or user.get("role") != "admin":
        return json_error("Unauthorized", 403)
    # Backward compatible alias for older clients; keep behavior consistent.
    return allocate_budget()

@app.route("/list_users", methods=["GET"])
def list_users():
    user = verify_token(request)
    if not user:
        return json_error("Unauthorized", 403)

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT u.id, u.name, r.name as role, u.department_id
        FROM users u
        JOIN roles r ON u.role_id = r.id
        ORDER BY u.id ASC
        """
    )
    rows = cur.fetchall()
    conn.close()

    data = []
    for row in rows or []:
        data.append(
            {
                "id": row["id"],
                "name": row["name"],
                "role": row["role"],
                "department_id": row["department_id"],
            }
        )
    return jsonify(data)

@app.route("/list_departments", methods=["GET"])
def list_departments():
    user = verify_token(request)
    if not user:
        return json_error("Unauthorized", 403)

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, name FROM departments ORDER BY id ASC")
    rows = cur.fetchall()
    conn.close()

    return jsonify([{"id": r["id"], "name": r["name"]} for r in rows or []])

@app.route("/list_budgets", methods=["GET"])
def list_budgets():
    user = verify_token(request)
    if not user or user.get("role") != "admin":
        return json_error("Unauthorized", 403)

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT b.department_id, d.name, b.total_budget, b.used_budget
        FROM budgets b
        JOIN departments d ON b.department_id = d.id
        ORDER BY b.department_id ASC
        """
    )
    rows = cur.fetchall()
    conn.close()

    data = []
    for r in rows or []:
        total = float(r["total_budget"] or 0)
        used = float(r["used_budget"] or 0)
        remaining = total - used
        data.append(
            {
                "department_id": r["department_id"],
                "name": r["name"],
                "total_budget": total,
                "used_budget": used,
                "remaining_budget": remaining,
            }
        )
    return jsonify(data)

@app.route("/department_details", methods=["GET"])
def department_details():
    user = verify_token(request)
    if not user or user.get("role") != "admin":
        return json_error("Unauthorized", 403)

    dept_id = request.args.get("department_id")
    try:
        dept_id = int(dept_id)
    except Exception:
        return json_error("department_id query param is required", 400)

    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT id, name FROM departments WHERE id=?", (dept_id,))
    dept = cur.fetchone()
    if not dept:
        conn.close()
        return json_error("Department not found", 404)

    cur.execute("SELECT total_budget, used_budget FROM budgets WHERE department_id=?", (dept_id,))
    b = cur.fetchone()
    conn.close()

    total = float(b["total_budget"] or 0) if b else 0.0
    used = float(b["used_budget"] or 0) if b else 0.0
    remaining = total - used

    return jsonify(
        {
            "department_id": dept["id"],
            "name": dept["name"],
            "total_budget": total,
            "used_budget": used,
            "remaining_budget": remaining,
        }
    )

@app.route("/delete_user/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    user = verify_token(request)
    if not user or user.get("role") != "admin":
        return json_error("Unauthorized", 403)

    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT id, name, role_id FROM users WHERE id=?", (user_id,))
    target = cur.fetchone()
    if not target:
        conn.close()
        return json_error("User not found", 404)

    # Never delete admin users (critical safety)
    if int(target["role_id"]) == 1:
        conn.close()
        return json_error("Cannot delete admin users", 400)

    cur.execute("DELETE FROM users WHERE id=?", (user_id,))
    conn.commit()
    conn.close()

    print(f"[finops] delete_user: admin={user.get('user_id')} deleted_user_id={user_id} name={target['name']}")
    return jsonify({"message": "Deleted successfully"})

@app.route("/delete_department/<int:dept_id>", methods=["DELETE"])
def delete_department(dept_id):
    user = verify_token(request)
    if not user or user.get("role") != "admin":
        return json_error("Unauthorized", 403)

    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT id, name FROM departments WHERE id=?", (dept_id,))
    dept = cur.fetchone()
    if not dept:
        conn.close()
        return json_error("Department not found", 404)

    # Block deletion if users assigned
    cur.execute("SELECT 1 FROM users WHERE department_id=? LIMIT 1", (dept_id,))
    user_ref = cur.fetchone()
    if user_ref:
        conn.close()
        return json_error("Cannot delete department: users are assigned to it", 400)

    # Block deletion if transactions exist
    cur.execute("SELECT 1 FROM transactions WHERE department_id=? LIMIT 1", (dept_id,))
    tx_ref = cur.fetchone()
    if tx_ref:
        conn.close()
        return json_error("Cannot delete department: transactions exist for it", 400)

    cur.execute("DELETE FROM departments WHERE id=?", (dept_id,))
    conn.commit()
    conn.close()

    print(f"[finops] delete_department: admin={user.get('user_id')} deleted_dept_id={dept_id} name={dept['name']}")
    return jsonify({"message": "Deleted successfully"})

# ---------------- TRANSACTIONS ----------------

@app.route("/request_transaction", methods=["POST"])
def request_tx():
    user = verify_token(request)
    if not user or user.get("role") != "vendor":
        return json_error("Unauthorized", 403)

    data = get_json()
    amount = data.get("amount")
    department_id = data.get("department_id")

    try:
        amount = float(amount)
        department_id = int(department_id)
    except Exception:
        return json_error("Invalid amount or department_id", 400)

    if amount <= 0:
        return json_error("amount must be > 0", 400)

    conn = get_db()
    cur = conn.cursor()

    # Validate department exists
    cur.execute("SELECT id FROM departments WHERE id=?", (department_id,))
    dept = cur.fetchone()
    if not dept:
        conn.close()
        return json_error("Department not found", 404)

    # Validate budget exists
    cur.execute("SELECT total_budget FROM budgets WHERE department_id=?", (department_id,))
    budget = cur.fetchone()
    if not budget or budget["total_budget"] is None:
        conn.close()
        return json_error("No budget", 400)

    total_budget = float(budget["total_budget"]) if budget["total_budget"] is not None else 0.0
    if total_budget <= 0:
        conn.close()
        return json_error("No budget", 400)

    percentage = (amount / total_budget) * 100.0
    approver_role = "employee" if percentage <= 40.0 else "manager"

    cur.execute(
        """
        INSERT INTO transactions (user_id, department_id, amount, status, approver_role, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (int(user["user_id"]), department_id, amount, "pending", approver_role, now_iso()),
    )

    conn.commit()
    conn.close()

    print(f"[finops] request_transaction: user_id={user['user_id']} dept={department_id} amount={amount} routed_to={approver_role}")
    return jsonify({"status": "pending", "routed_to": approver_role})

@app.route("/pending_transactions")
def pending_tx():
    user = verify_token(request)
    if not user:
        return json_error("Unauthorized", 403)

    conn = get_db()
    cur = conn.cursor()

    # 👇 show both pending + approved/rejected for that role
    cur.execute("""
    SELECT * FROM transactions
    WHERE approver_role=? AND status='pending'
    ORDER BY id DESC
""", (user["role"],))

    data = [dict(row) for row in cur.fetchall()]
    conn.close()

    return jsonify(data)

@app.route("/approve_transaction", methods=["POST"])
def approve_tx():
    user = verify_token(request)
    if not user:
        return json_error("Unauthorized", 403)

    data = get_json()
    tx_id = data.get("transaction_id")
    status = str(data.get("status") or "").strip().lower()

    if status not in ("approved", "rejected"):
        return json_error("Invalid status (must be approved or rejected)", 400)

    try:
        tx_id = int(tx_id)
    except Exception:
        return json_error("Invalid transaction_id", 400)

    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT id, user_id, department_id, amount, status, approver_role FROM transactions WHERE id=?", (tx_id,))
    tx = cur.fetchone()
    if not tx:
        conn.close()
        return json_error("Transaction not found", 404)

    if str(tx["status"] or "").lower() != "pending":
        conn.close()
        return json_error("Transaction is not pending", 400)

    if tx["approver_role"] != user.get("role"):
        conn.close()
        return json_error("Not allowed", 403)

    # Budget update on approval (safe + validated)
    if status == "approved":
        try:
            dept_id = int(tx["department_id"])
            amount = float(tx["amount"] or 0)
        except Exception:
            conn.close()
            return json_error("Invalid transaction data for budget update", 400)

        if amount <= 0:
            conn.close()
            return json_error("Invalid transaction amount", 400)

        cur.execute("SELECT total_budget, used_budget FROM budgets WHERE department_id=?", (dept_id,))
        b = cur.fetchone()
        if not b:
            conn.close()
            return json_error("No budget for department", 400)

        total_budget = float(b["total_budget"] or 0)
        used_budget = float(b["used_budget"] or 0)

        if total_budget <= 0:
            conn.close()
            return json_error("Invalid department budget", 400)

        if used_budget + amount > total_budget:
            conn.close()
            return json_error("Budget exceeded", 400, extra={"total_budget": total_budget, "used_budget": used_budget})

        cur.execute(
            "UPDATE budgets SET used_budget = used_budget + ? WHERE department_id=?",
            (amount, dept_id),
        )

    # Update transaction status
    cur.execute("UPDATE transactions SET status=? WHERE id=?", (status, tx_id))

    # Blockchain logging (non-fatal)
    cur.execute("SELECT current_hash FROM audit_logs ORDER BY id DESC LIMIT 1")
    prev = cur.fetchone()
    prev_hash = prev["current_hash"] if prev and prev["current_hash"] else "0"

    log_data = {"tx": tx_id, "amount": tx["amount"], "status": status}
    curr_hash = generate_hash(log_data, prev_hash)

    blockchain_ok = False
    try:
        if contract and w3.is_connected():
            accounts = getattr(w3.eth, "accounts", None)
            if accounts and len(accounts) > 0:
                account = accounts[0]
                tx_hash = contract.functions.storeAudit(tx_id, curr_hash).transact({"from": account})
                w3.eth.wait_for_transaction_receipt(tx_hash)
                blockchain_ok = True
    except Exception as e:
        print("[finops] blockchain write failed:", str(e))

    cur.execute(
        """
        INSERT INTO audit_logs (action, data, previous_hash, current_hash, timestamp)
        VALUES (?, ?, ?, ?, ?)
        """,
        (status, json.dumps(log_data), prev_hash, curr_hash, now_iso()),
    )

    # ✅ Save to history table
    cur.execute("""
        INSERT INTO transaction_history (transaction_id, action, role, user_id, timestamp)
        VALUES (?, ?, ?, ?, ?)
    """, (
        tx_id,
        status,
        user["role"],
        user["user_id"],
        now_iso()
    ))
    conn.commit()
    conn.close()

    print(f"[finops] approve_transaction: tx_id={tx_id} status={status} blockchain_ok={blockchain_ok}")
    return jsonify({"status": status})

@app.route("/transaction_history")
def transaction_history():
    user = verify_token(request)
    if not user:
        return json_error("Unauthorized", 403)

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT th.transaction_id, th.action, th.role, th.timestamp, t.amount
        FROM transaction_history th
        JOIN transactions t ON th.transaction_id = t.id
        WHERE th.role=?
        ORDER BY th.id DESC
    """, (user["role"],))

    data = [dict(row) for row in cur.fetchall()]
    conn.close()

    return jsonify(data)

@app.route("/vendor_transactions")
def vendor_tx():
    user = verify_token(request)
    if not user or user.get("role") != "vendor":
        return json_error("Unauthorized", 403)

    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT * FROM transactions WHERE user_id=?", (user["user_id"],))
    data = [dict(row) for row in cur.fetchall()]

    conn.close()
    return jsonify(data)

@app.route("/list_transactions", methods=["GET"])
def list_transactions():
    user = verify_token(request)
    if not user:
        return json_error("Unauthorized", 403)

    conn = get_db()
    cur = conn.cursor()

    # Role-based visibility:
    # - vendor: only own transactions
    # - others: all transactions (frontend filters pending by approver_role)
    if user.get("role") == "vendor":
        cur.execute(
            "SELECT id, amount, status, department_id, approver_role FROM transactions WHERE user_id=? ORDER BY id ASC",
            (int(user["user_id"]),),
        )
    else:
        cur.execute("SELECT id, amount, status, department_id, approver_role FROM transactions ORDER BY id ASC")

    rows = cur.fetchall()
    conn.close()

    data = []
    for r in rows or []:
        data.append(
            {
                "id": r["id"],
                "amount": r["amount"],
                "status": r["status"],
                "department_id": r["department_id"],
                "approver_role": r["approver_role"],
            }
        )
    return jsonify(data)

# ---------------- AUDIT ----------------

@app.route("/audit_logs")
def audit_logs():
    user = verify_token(request)
    if not user or user.get("role") != "admin":
        return json_error("Unauthorized", 403)

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, action, current_hash FROM audit_logs ORDER BY id ASC")
    rows = cur.fetchall()
    conn.close()

    data = []
    for r in rows or []:
        data.append({"id": r["id"], "action": r["action"], "current_hash": r["current_hash"]})
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

# ---------------- ERROR HANDLING ----------------

@app.errorhandler(404)
def not_found(_e):
    return json_error("Not found", 404)

@app.errorhandler(405)
def not_allowed(_e):
    return json_error("Method not allowed", 400)

@app.errorhandler(Exception)
def handle_unexpected(e):
    # Ensure we never leak a 500 to the frontend; log for debugging.
    print("[finops] UNEXPECTED ERROR:", str(e))
    traceback.print_exc()
    return json_error("Bad request", 400)

# ---------------- RUN ----------------

if __name__ == "__main__":
    init_db()
    seed_roles()
    app.run(debug=True)