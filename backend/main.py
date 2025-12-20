from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import datetime
import uuid

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---
class Transaction(BaseModel):
    id: str
    date: str
    amount: float
    category: str
    description: str
    type: str # 'income' | 'expense'

class Account(BaseModel):
    id: str
    name: str
    balance: float
    type: str # 'checking' | 'savings' | 'investment'

class Budget(BaseModel):
    category: str
    limit: float
    spent: float

class Biller(BaseModel):
    id: str
    name: str
    category: str
    lastPaymentDate: Optional[str] = None
    autoPay: bool

class Bill(BaseModel):
    id: str
    billerId: str
    amount: float
    dueDate: str
    status: str # 'pending' | 'paid'

class FinancialInsight(BaseModel):
    id: str
    title: str
    content: str
    type: str # 'saving' | 'budgeting' | 'investment' | 'debt'
    impact: str # 'high' | 'medium' | 'low'

class FinanceState(BaseModel):
    accounts: List[Account]
    transactions: List[Transaction]
    budgets: List[Budget]
    billers: List[Biller]
    bills: List[Bill]
    insights: List[FinancialInsight]

import json
import os

# ... (Previous imports remain, handled by context)

# --- Database Persistence ---
DATA_FILE = "finance_data.json"

def save_db():
    with open(DATA_FILE, "w") as f:
        f.write(db.model_dump_json(indent=2))

def load_db():
    global db
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r") as f:
                data = json.load(f)
                db = FinanceState(**data)
            print(f"Loaded database from {DATA_FILE}")
        except Exception as e:
            print(f"Failed to load database: {e}")

# --- Database (In-Memory Default) ---
db: FinanceState = FinanceState(
    accounts=[
        Account(id='1', name='Main Checking', balance=4250.75, type='checking'),
        Account(id='2', name='Emergency Fund', balance=12000.00, type='savings'),
        Account(id='3', name='Robinhood Portfolio', balance=8560.20, type='investment'),
    ],
    transactions=[
        Transaction(id='t1', date='2024-05-15', amount=3500, category='Salary', description='Monthly Paycheck', type='income'),
        Transaction(id='t2', date='2024-05-16', amount=1200, category='Housing', description='Rent payment', type='expense'),
        Transaction(id='t3', date='2024-05-17', amount=5.45, category='Food', description='Starbucks Coffee', type='expense'),
        Transaction(id='t4', date='2024-05-18', amount=65.20, category='Shopping', description='Amazon - Household', type='expense'),
        Transaction(id='t5', date='2024-05-19', amount=120, category='Utilities', description='Electric Bill', type='expense'),
    ],
    budgets=[
        Budget(category='Food', limit=500, spent=340),
        Budget(category='Entertainment', limit=200, spent=150),
        Budget(category='Transport', limit=300, spent=85),
    ],
    billers=[
        Biller(id='b1', name='Verizon Wireless', category='Utilities', autoPay=False),
        Biller(id='b2', name='State Farm Insurance', category='Insurance', autoPay=True),
        Biller(id='b3', name='City Water Dept', category='Utilities', autoPay=False),
    ],
    bills=[
        Bill(id='bill1', billerId='b1', amount=85.00, dueDate='2024-06-01', status='pending'),
        Bill(id='bill2', billerId='b3', amount=42.50, dueDate='2024-06-05', status='pending'),
    ],
    insights=[
        FinancialInsight(
            id='i1', 
            title='High Subscription Spend', 
            content='You spent $120 on streaming services this month. Canceling one could save you $480/year.', 
            type='budgeting', 
            impact='medium'
        )
    ]
)

# Load existing data if available
load_db()

# --- Endpoints ---

@app.get("/api/state")
async def get_state():
    return db

@app.post("/api/transaction")
async def add_transaction(tx: Transaction):
    # Update balance logic
    checking = next((a for a in db.accounts if a.type == 'checking'), None)
    if checking:
        if tx.type == 'income':
            checking.balance += tx.amount
        else:
            checking.balance -= tx.amount
    
    db.transactions.insert(0, tx)
    save_db()
    return {"message": "Transaction added", "new_balance": checking.balance if checking else 0}

@app.post("/api/bill/pay")
async def pay_bill(bill_id: str):
    bill = next((b for b in db.bills if b.id == bill_id), None)
    if not bill:
        raise HTTPException(404, "Bill not found")
    
    if bill.status == 'paid':
         return {"message": "Bill already paid"}

    bill.status = 'paid'
    
    # Create transaction
    biller = next((b for b in db.billers if b.id == bill.billerId), None)
    biller_name = biller.name if biller else "Unknown Biller"
    
    new_tx = Transaction(
        id=str(uuid.uuid4()),
        date=str(datetime.date.today()),
        amount=bill.amount,
        category='Bills',
        description=f"Payment to {biller_name}",
        type='expense'
    )
    
    # Update balance
    checking = next((a for a in db.accounts if a.type == 'checking'), None)
    if checking:
        checking.balance -= bill.amount
        
    db.transactions.insert(0, new_tx)
    save_db()
    
    return {"message": "Bill paid successfully", "transaction_id": new_tx.id}

@app.post("/api/insight")
async def add_insight(insight: FinancialInsight):
    db.insights.insert(0, insight)
    save_db()
    return {"message": "Insight added"}

class TransferRequest(BaseModel):
    from_account: str
    to_account: str
    amount: float

@app.post("/api/transfer")
async def transfer_funds(req: TransferRequest):
    # Helper to find account by id or name (loose match)
    def find_account(query: str):
        query = query.lower()
        # Try exact type match first
        acc = next((a for a in db.accounts if a.type == query), None)
        if acc: return acc
        # Try name contains
        return next((a for a in db.accounts if query in a.name.lower() or a.name.lower() in query), None)

    source = find_account(req.from_account)
    dest = find_account(req.to_account)

    if not source:
        raise HTTPException(404, f"Source account '{req.from_account}' not found")
    if not dest:
        raise HTTPException(404, f"Destination account '{req.to_account}' not found")
    if source.balance < req.amount:
        raise HTTPException(400, "Insufficient funds")

    source.balance -= req.amount
    dest.balance += req.amount

    # Record value of transaction for history
    new_tx = Transaction(
        id=str(uuid.uuid4()),
        date=str(datetime.date.today()),
        amount=req.amount,
        category='Transfer',
        description=f"Transfer from {source.name} to {dest.name}",
        type='expense' 
    )
    db.transactions.insert(0, new_tx)
    save_db()

    return {"message": f"Transferred ${req.amount} from {source.name} to {dest.name}", "new_source_balance": source.balance, "new_dest_balance": dest.balance}


@app.get("/api/profile")
async def get_financial_profile():
    # Calculate metrics
    total_savings = sum(a.balance for a in db.accounts if a.type == 'savings')
    total_balance = sum(a.balance for a in db.accounts)
    
    # Simple logic: assume transactions list is recent (in real app, filter by date)
    # Let's filter for this "month" (or just last 30 days if dates were real objects, but they are strings 'YYYY-MM-DD')
    # For now, to ensure data, we take all transactions in the DB as "recent history"
    
    income = sum(t.amount for t in db.transactions if t.type == 'income')
    expenses = sum(t.amount for t in db.transactions if t.type == 'expense')
    
    savings_rate = 0
    if income > 0:
        savings_rate = ((income - expenses) / income) * 100
        
    monthly_burn = expenses # Assuming the DB represents a month context for simplicity
    
    runway_months = 0
    if monthly_burn > 0:
        runway_months = total_savings / monthly_burn

    return {
        "accounts": db.accounts,
        "metrics": {
            "total_savings": total_savings,
            "total_liquidity": total_balance,
            "monthly_income": income,
            "monthly_expenses": expenses,
            "savings_rate_pct": round(savings_rate, 1),
            "emergency_runway_months": round(runway_months, 1)
        },
        "recent_transactions": db.transactions[:10],
        "budgets": db.budgets
    }
