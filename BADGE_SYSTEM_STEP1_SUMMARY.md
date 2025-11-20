# Badge System - Step 1: Data Models Implementation

## Overview
This document summarizes the implementation of the Badge system data models (Step 1). This is the foundation for the achievement/badge system that will allow users to unlock badges for various accomplishments.

## ✅ Completed Tasks

### 1. Badge Model (`src/models/badge.py`)
Created the `Badge` model with the following fields:
- `id` - Primary key
- `code` - Unique string identifier (e.g., "STREAK_3", "XP_500")
- `name` - Human-readable name
- `description` - Description of how to earn the badge
- `icon` - Optional emoji or icon identifier
- `created_at` - Timestamp of badge creation

**Features:**
- Unique constraint on `code` field
- Index on `code` for fast lookups
- Relationship to `UserBadge` with cascade delete

### 2. UserBadge Model (`src/models/user_badge.py`)
Created the `UserBadge` model with the following fields:
- `id` - Primary key
- `user_id` - Foreign key to Users table
- `badge_id` - Foreign key to Badges table
- `unlocked_at` - Timestamp of when badge was unlocked

**Features:**
- Foreign key constraints with CASCADE delete
- Unique constraint on `(user_id, badge_id)` - prevents duplicate unlocks
- Indexes on `user_id` and `badge_id` for efficient queries
- Relationships to both `User` and `Badge` models

### 3. Model Registry Update (`src/models/__init__.py`)
- Added `Badge` and `UserBadge` to the lazy import system
- Added entries to `__all__` and `_MODULE_MAP`

### 4. Database Migration (`migrations/versions/474997dc6e24_add_badges_and_user_badges_tables.py`)
Created migration with:
- `Badges` table creation
- `UserBadges` table creation
- All indexes and constraints
- Proper downgrade path

**Migration successfully applied** to the database.

### 5. Testing
Comprehensive verification completed:
- ✅ Badge model can be created
- ✅ Badge code uniqueness enforced
- ✅ UserBadge model can be created
- ✅ Unique constraint on (user_id, badge_id) works
- ✅ User can have multiple different badges
- ✅ Badge → UserBadge relationship works
- ✅ Cascade delete works (deleting badge deletes user_badges)
- ✅ Optional icon field works
- ✅ App starts successfully with new models
- ✅ Zero regressions

### 6. Test Environment Updates (`tests/conftest.py`)
Updated test configuration to support new models:
- Added `IntegrityError` to SQLAlchemy stubs
- Added `UniqueConstraint` to SQLAlchemy stubs
- Added `Badge` and `UserBadge` to dummy models

## Database Schema

### Badges Table
```sql
CREATE TABLE Badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    description VARCHAR NOT NULL,
    icon VARCHAR,
    created_at DATETIME
);
CREATE INDEX idx_badges_code ON Badges (code);
```

### UserBadges Table
```sql
CREATE TABLE UserBadges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    badge_id INTEGER NOT NULL,
    unlocked_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users (id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES Badges (id) ON DELETE CASCADE,
    CONSTRAINT uq_user_badge UNIQUE (user_id, badge_id)
);
CREATE INDEX idx_user_badges_user ON UserBadges (user_id);
CREATE INDEX idx_user_badges_badge ON UserBadges (badge_id);
```

## Example Badge Definitions

Once the unlock logic is implemented (Step 2), badges like these can be defined:

```python
Badge(
    code="STREAK_3",
    name="3-Day Streak",
    description="Complete a 3-day practice streak.",
    icon="🔥"
)

Badge(
    code="XP_500",
    name="500 XP",
    description="Earn a total of 500 XP.",
    icon="⭐"
)

Badge(
    code="FIRST_SESSION",
    name="Getting Started",
    description="Complete your first practice session.",
    icon="🎯"
)
```

## Next Steps (Not Yet Implemented)

**Step 2: Badge Unlock Logic**
- Create service for checking badge unlock conditions
- Implement unlock triggers after sessions
- Add badge seeding/initialization

**Step 3: API Endpoints**
- GET /api/v2/badges - List all badges
- GET /api/v2/users/{user_id}/badges - Get user's unlocked badges

**Step 4: UI Components**
- Badge display components
- Unlock animations
- Badge gallery/collection view

## Files Modified

### Created:
- `src/models/badge.py`
- `src/models/user_badge.py`
- `migrations/versions/474997dc6e24_add_badges_and_user_badges_tables.py`
- `BADGE_SYSTEM_STEP1_SUMMARY.md` (this file)

### Modified:
- `src/models/__init__.py`
- `tests/conftest.py`

## Verification

To verify the models are working:
```python
from src.models import Badge, UserBadge
from src.core.database import SessionLocal

session = SessionLocal()
badges = session.query(Badge).all()
user_badges = session.query(UserBadge).all()
print(f"Badges: {len(badges)}, User Badges: {len(user_badges)}")
session.close()
```

## Status: ✅ COMPLETE

All acceptance criteria for Step 1 have been met:
- ✅ Badge model exists
- ✅ UserBadge model exists
- ✅ Proper FK relationships (Users.id, Badges.id)
- ✅ Migration created successfully
- ✅ App starts with new models
- ✅ Zero regressions
- ✅ No unlock logic (as required for Step 1)
- ✅ No API logic (as required for Step 1)
- ✅ No UI logic (as required for Step 1)

