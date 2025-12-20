# Integration Guide: Real Financial Data with Plaid

To move from mock data to real bank accounts, checking, and savings, we recommend integrating **Plaid**.

## Prerequisites
1. Sign up for a free developer account at [plaid.com](https://plaid.com).
2. Get your `PLAID_CLIENT_ID` and `PLAID_SECRET`.

## Implementation Steps

### 1. Backend Dependencies
Install the Plaid python client:
```bash
pip install plaid-python
```

### 2. Backend Setup (`backend/main.py`)
Initialize the Plaid client:
```python
import plaid
from plaid.api import plaid_api

configuration = plaid.Configuration(
    host=plaid.Environment.Sandbox,
    api_key={
        'clientId': 'YOUR_CLIENT_ID',
        'secret': 'YOUR_SECRET',
    }
)
api_client = plaid.ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)
```

### 3. Link Token (Frontend <-> Backend)
You need an endpoint to create a "Link Token" which the frontend uses to open the Plaid login modal.
- Create endpoint `POST /api/create_link_token`.
- Frontend uses `react-plaid-link` to open the secure banking login.

### 4. Exchange Token
Once user logs in, Plaid gives the frontend a `public_token`. Use this to get an `access_token` on the backend.
- Create endpoint `POST /api/set_access_token`.
- Save this `access_token` securely (encrypted) associated with the user.

### 5. Fetch Real Data
Replace our `db.accounts` and `db.transactions` logic with Plaid calls:
```python
# Fetch Balance
balances = client.accounts_balance_get(
    AccountsBalanceGetRequest(access_token=access_token)
)

# Fetch Transactions
request = TransactionsGetRequest(
    access_token=access_token,
    start_date=date(2024, 1, 1),
    end_date=date(2024, 6, 1)
)
response = client.transactions_get(request)
real_transactions = response['transactions']
```

## Recommendation Logic
Once you have `real_transactions`:
1. Calculate **Monthly Burn**: Average expenses over last 3 months.
2. Calculate **Runway**: `Total Savings / Monthly Burn`.
3. Feed these metrics into the AI Prompt (as we are doing with the mock metrics now).
