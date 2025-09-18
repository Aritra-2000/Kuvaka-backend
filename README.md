# 🚀 Lead Scoring Backend Service

This project implements a backend service that ingests product/offer information and prospect leads (via CSV), then assigns a buying intent score (`High`, `Medium`, `Low`) to each lead using **rule-based logic + AI reasoning**.

---

## 📌 Features

- **Input APIs**
  - `POST /offer` → Store product/offer details.
  - `POST /leads/upload` → Upload CSV file with lead data.

- **Scoring Pipeline**
  - **Rule Layer (Max 50 pts)**
    - Role relevance: Decision maker (+20), Influencer (+10), else 0.
    - Industry match: Exact ICP (+20), Adjacent (+10), else 0.
    - Data completeness: All fields present (+10).
  - **AI Layer (Max 50 pts)**
    - Uses AI model (Gemini) with context (offer + prospect data).
    - Prompt:  
      _“Classify intent (High/Medium/Low) and explain in 1–2 sentences.”_
    - Maps `High=50, Medium=30, Low=10`.
  - **Final Score** = Rule Score + AI Score.

- **Output APIs**
  - `POST /score` → Run scoring pipeline on uploaded leads.
  - `GET /results` → Return scored leads with reasoning.
  - `GET /results/export` → Download results as CSV (optional).

---

## 🛠️ Tech Stack

- **Backend Framework**: Express.js (Node.js)  
- **Database**: MongoDB  
- **AI Integration**: Gemini (default, configurable)  
- **Deployment**: Render(free tier)  

---

## ⚙️ Setup & Installation

1. **Clone Repo**
   ```bash
   git clone https://github.com/your-username/lead-scoring-backend.git
   cd lead-scoring-backend
Install Dependencies

bash
Copy code
npm install
Setup Environment Variables
Create .env file:

env
Copy code
PORT=3000
GEMINI_API_KEY=your_gemini_api_key
Run Server

bash
Copy code
npm run dev
Server Running At

arduino
Copy code
http://localhost:3000
📡 API Documentation
1️⃣ POST /offer
Store product/offer details.

Headers:
Content-Type: application/json

Request Body

json
Copy code
{
  "name": "AI Outreach Automation",
  "value_props": ["24/7 outreach", "6x more meetings"],
  "ideal_use_cases": ["B2B SaaS mid-market"]
}
Success Response (201)

json
Copy code
{
  "message": "Offer saved successfully"
}
Error Response (400)

json
Copy code
{
  "error": "Invalid offer data. Please provide name, value_props, and ideal_use_cases."
}
2️⃣ POST /leads/upload
Upload leads CSV file.

Headers:
Content-Type: multipart/form-data

Form Data

file → CSV file with leads.

CSV Format

csv
Copy code
name,role,company,industry,location,linkedin_bio
Ava Patel,Head of Growth,FlowMetrics,B2B SaaS,New York,"Growth strategist in SaaS"
John Smith,Engineer,DataTech,Manufacturing,Chicago,"Backend engineer"
Success Response (201)

json
Copy code
{
  "message": "Leads uploaded successfully",
  "count": 2
}
Error Response (400)

json
Copy code
{
  "error": "Invalid CSV format. Required columns: name, role, company, industry, location, linkedin_bio."
}
3️⃣ POST /score
Run scoring pipeline (rule layer + AI layer).

Headers:
Content-Type: application/json

Request Body

json
Copy code
{
  "ai_provider": "openai", 
  "model": "gpt-4o-mini"
}
Success Response (200)

json
Copy code
{
  "message": "Scoring completed",
  "results_count": 2
}
Error Response (400)

json
Copy code
{
  "error": "No leads uploaded. Please upload leads first."
}
4️⃣ GET /results
Retrieve scored leads.

Headers:
Accept: application/json

Success Response (200)

json
Copy code
[
  {
    "name": "Ava Patel",
    "role": "Head of Growth",
    "company": "FlowMetrics",
    "intent": "High",
    "score": 85,
    "reasoning": "Fits ICP SaaS mid-market and role is decision maker."
  },
  {
    "name": "John Smith",
    "role": "Engineer",
    "company": "DataTech",
    "intent": "Low",
    "score": 25,
    "reasoning": "Not a decision maker, industry mismatch."
  }
]
Error Response (404)

json
Copy code
{
  "error": "No scored results found. Run /score first."
}
5️⃣ GET /results/export (Optional)
Export results as CSV file.

Success Response (200) → CSV download with headers:

pgsql
Copy code
name,role,company,intent,score,reasoning
Ava Patel,Head of Growth,FlowMetrics,High,85,"Fits ICP SaaS mid-market..."
John Smith,Engineer,DataTech,Low,25,"Not a decision maker..."
Error Response (404)

json
Copy code
{
  "error": "No scored results found."
}
🧠 Scoring Logic
Rule Layer (0–50 pts)
Role relevance

Decision maker (Head, VP, CXO, Director) → +20

Influencer (Manager, Lead) → +10

Others → +0

Industry match

Exact match with ideal_use_cases → +20

Related/adjacent industry → +10

No match → +0

Data completeness

All fields present (name, role, company, industry, location, linkedin_bio) → +10

AI Layer (0–50 pts)
Prompt:

text
Copy code
You are a sales intelligence assistant.
Given the product offer details and the lead profile,
classify the buying intent as High, Medium, or Low.
Provide a short reasoning (1-2 sentences).
Mapping:

High → 50

Medium → 30

Low → 10
