from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import datetime
import uuid
import json
import os

# --- Plaid Imports (Stub) ---
# In a real implementation, you would import plaid here
# import plaid
# from plaid.api import plaid_api
# from plaid.model.link_token_create_request import LinkTokenCreateRequest
# from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
# from plaid.model.products import Products
# from plaid.model.country_code import CountryCode

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
    accounts: List[Account] = []
    transactions: List[Transaction] = []
    budgets: List[Budget] = []
    billers: List[Biller] = []
    bills: List[Bill] = []
    insights: List[FinancialInsight] = []
    
    # Plaid specific fields
    access_token: Optional[str] = None
    item_id: Optional[str] = None

# --- Database Persistence ---
DATA_FILE = "finance_data.json"

# Initialize empty DB
db: FinanceState = FinanceState()

def save_db():
    with open(DATA_FILE, "w") as f:
        f.write(db.model_dump_json(indent=2))

def load_db():
    global db
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r") as f:
                data = json.load(f)
                # Ensure lists are initialized if missing in JSON
                db = FinanceState(**data)
            print(f"Loaded database from {DATA_FILE}")
        except Exception as e:
            print(f"Failed to load database: {e}")
            db = FinanceState() # Fallback to empty
    else:
        print("No existing database found. Starting fresh.")
        save_db()

# Load existing data if available
load_db()

# --- Endpoints ---

@app.get("/api/state")
async def get_state():
    return db

@app.get("/api/accounts")
async def get_accounts():
    return db.accounts

@app.get("/api/transactions")
async def get_transactions():
    return db.transactions

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
    
    income = sum(t.amount for t in db.transactions if t.type == 'income')
    expenses = sum(t.amount for t in db.transactions if t.type == 'expense')
    
    savings_rate = 0
    if income > 0:
        savings_rate = ((income - expenses) / income) * 100
        
    monthly_burn = expenses 
    
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

# --- Plaid Integration Stubs ---

@app.post("/api/create_link_token")
async def create_link_token():
    # In a real app, you would call Plaid API here to get a link token
    # return client.link_token_create(request)
    return {"link_token": "link-sandbox-placeholder-token"}

@app.post("/api/set_access_token")
async def set_access_token(public_token: str = Body(..., embed=True)):
    # In a real app, exchange public_token for access_token via Plaid API
    # exchange_response = client.item_public_token_exchange(...)
    # db.access_token = exchange_response['access_token']
    
    # Simulating saving a token
    db.access_token = f"access-sandbox-{uuid.uuid4()}"
    save_db()
    return {"message": "Access token saved successfully"}
