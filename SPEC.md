# SNAP 設計 CRM — Full Specification

## Overview
Mobile-first CRM web app for SNAP 設計 (interior design company in Taiwan). Primary user: Lesley Ying (sales rep using phone). Secondary user: Roger Lee (owner/admin).

## Tech Stack
- **Frontend:** Next.js 14 App Router with TypeScript
- **UI:** Tailwind CSS — mobile-first, large tap targets, clean design
- **Backend:** Supabase (Postgres + Auth + Realtime + Storage)
- **Hosting:** Vercel
- **Domain:** crm34525.snapdesign.tw

## Supabase Connection
- **Project:** dlnkgpdwwefiyebyjmkr (existing, Tokyo region)
- **Supabase URL:** https://dlnkgpdwwefiyebyjmkr.supabase.co
- **Anon Key:** (will be set in .env.local)

## Auth
- Simple email/password login via Supabase Auth
- Two users initially: Roger (admin), Lesley (sales)
- Role-based: admin sees everything, sales sees own leads + shared pipeline

## Database Schema

### Table: customers
| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | uuid (PK) | auto | |
| created_at | timestamptz | auto | |
| updated_at | timestamptz | auto | |
| name | text | ✅ | 姓名 |
| phone | text | ✅ | 電話 |
| line_id | text | ✅ | LINE ID |
| email | text | | |
| preferred_title | text | | 先生/小姐/etc |
| lead_source | text | ✅ | enum: website, line, referral, 104, walk_in, social_media, 591, other |
| referral_from | text | | Name of referrer |
| listing_url | text | | 591 or other listing URL |
| address | text | ✅ | |
| district | text | | Taipei district |
| building_type | text | ✅ | enum: apartment_4to6, townhouse, building, other |
| unit_floor | integer | | 所在樓層 |
| total_floors | integer | | 總樓層 |
| building_age | integer | ✅ | Years |
| size_ping | numeric | | 坪數 |
| room_layout | text | | e.g. 3房2廳1衛 |
| current_condition | text | | enum: empty, occupied, rented, abandoned |
| ownership | text | | enum: self, family_shared, multi_owner |
| budget_range | text | ✅ | enum: under_30, 30_50, 50_80, 80_120, over_120, undecided |
| scope | text[] | | Array: living, bedroom, kitchen, bathroom, balcony, full, public_space |
| style_preference | text | | enum: modern, nordic, japanese, industrial, mixed, none |
| timeline | text | | enum: within_1mo, 1_3mo, 3_6mo, over_6mo, no_rush |
| special_needs | text | | Free text |
| google_drive_url | text | | Google Drive link for project files |
| subsidy_eligible | text | | enum: eligible, not_eligible, pending |
| eligibility_reasons | text[] | | Array: age_30plus, has_65plus, low_income, longterm_care |
| loan_subsidy_eligible | boolean | | 修繕住宅貸款利息補貼 |
| subsidy_notes | text | | Free text |
| current_stage | text | ✅ | Pipeline stage code |
| assigned_to | uuid (FK) | | References auth.users |
| quote_amount | numeric | | NT$ |
| contract_amount | numeric | | NT$ |
| next_followup | date | | |
| lost_reason | text | | enum: budget, timing, competitor, unresponsive, not_eligible, other |
| lost_reason_other | text | | When lost_reason = other |

### Table: stage_history
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| customer_id | uuid (FK) | References customers |
| from_stage | text | |
| to_stage | text | |
| changed_by | uuid (FK) | References auth.users |
| changed_at | timestamptz | auto |
| notes | text | |

### Table: activity_log
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| customer_id | uuid (FK) | References customers |
| activity_type | text | enum: note, call, line_message, site_visit, email, design, quote, contract, other |
| content | text | |
| created_by | uuid (FK) | |
| created_at | timestamptz | auto |

### Table: payments
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| customer_id | uuid (FK) | |
| amount | numeric | NT$ |
| payment_type | text | enum: deposit, installment, final, other |
| payment_date | date | |
| notes | text | |
| created_by | uuid (FK) | |
| created_at | timestamptz | auto |

## Pipeline Stages (ordered)
```
lead_generation:
  - new_inquiry (新詢問)
  - initial_screening (初步篩選)

consultation:
  - first_contact (已聯繫)
  - needs_assessment (需求確認)
  - subsidy_check (補助資格評估)

site_visit_design:
  - site_visit_scheduled (已約現勘)
  - site_visit_done (現勘完成)
  - designing (出圖中)
  - design_presented (已出圖)

closing:
  - revision (修改中)
  - quote_sent (報價中)
  - negotiating (議價中)
  - contract_signed (已簽約)

subsidy:
  - collecting_consent (住戶同意徵集)
  - structural_assessment (結構評估中)
  - subsidy_submitted (補助送件)
  - subsidy_approved (補助核准)

execution:
  - pre_construction (施工準備)
  - under_construction (施工中)
  - inspection (驗收)
  - completed (完工)

post_sale:
  - subsidy_reimbursement (補助請款)
  - followup (售後追蹤)
  - referral_generated (已推薦)

dead:
  - on_hold (暫緩)
  - lost (未成交)
```

## Pages

### 1. Login (/login)
- Email + password
- Mobile-friendly, centered form
- SNAP 設計 branding

### 2. Dashboard (/)
- Summary cards: total leads, active deals, this month's new, pipeline value
- Quick actions: + New Lead, View Pipeline
- Upcoming follow-ups (next 7 days)
- Recent activity feed

### 3. Pipeline View (/pipeline)
- Kanban-style board (horizontal scroll on mobile)
- Cards show: name, district, budget, days in stage
- Tap card → customer detail
- Drag-and-drop on desktop; tap-to-move on mobile

### 4. Customer List (/customers)
- Searchable, filterable table/list
- Filters: stage, district, building age, budget, lead source
- Sort: newest, follow-up date, last updated

### 5. Customer Detail (/customers/[id])
- All customer fields (editable)
- Stage indicator with change button
- Activity timeline (notes, calls, visits)
- Payment history (add new payment)
- Quick actions: Add Note, Log Call, Schedule Follow-up, Change Stage

### 6. New Customer (/customers/new)
- Multi-step form (mobile-friendly):
  - Step 1: Basic info (name, phone, LINE, source)
  - Step 2: Property info (address, building type, age, size)
  - Step 3: Project info (budget, scope, style, timeline)
  - Step 4: Subsidy check (auto-suggests based on building age)

## Design System
- **Primary color:** #e8734a (SNAP 設計 brand coral)
- **Secondary:** #f0a848 (warm gold)
- **Background:** #faf7f4 (warm off-white)
- **Cards:** white, rounded-xl, subtle shadow
- **Font:** Noto Sans TC (same as website)
- **Minimum tap target:** 44px
- **All text in Traditional Chinese** (field labels, buttons, etc.)
- **English for internal codes only** (database columns, stage codes)

## Key Mobile UX Principles
- Sticky bottom nav: Dashboard, Pipeline, Customers, + New
- Floating action button for quick-add note
- Swipe gestures where appropriate
- Camera button on customer detail for site visit photos
- LINE deep link button (line://msg/text/{message})
- Pull-to-refresh on lists
