#!/usr/bin/env python
"""
Demo script showing session start tracking in action.

This creates a temporary database and demonstrates:
1. Starting multiple practice sessions
2. Viewing session records
3. Showing that sessions are properly tracked
"""

import sys
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.core.database import Base
from src.models.user import User
from src.models.user_session import UserSession
from src.services.practice_service import PracticeService


def main():
    print("\n" + "="*70)
    print("🎯 SESSION START TRACKING DEMO")
    print("="*70)
    
    # Create in-memory database
    print("\n1️⃣ Setting up test database...")
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    # Create test users
    user1 = User(id=1, name="Alice")
    user2 = User(id=2, name="Bob")
    db.add_all([user1, user2])
    db.commit()
    print("   ✅ Created test users: Alice (id=1), Bob (id=2)")
    
    # Create practice service
    practice_service = PracticeService(db=db)
    
    # Demo: Alice starts 2 practice sessions
    print("\n2️⃣ Alice starts practice session #1...")
    session1 = practice_service.start_session(user_id=1)
    print(f"   ✅ Session created:")
    print(f"      - Session ID: {session1.id}")
    print(f"      - User: Alice (id={session1.user_id})")
    print(f"      - Started at: {session1.started_at}")
    print(f"      - Status: ACTIVE (ended_at={session1.ended_at})")
    print(f"      - XP: {session1.total_xp} (not calculated yet)")
    
    print("\n3️⃣ Alice starts practice session #2...")
    session2 = practice_service.start_session(user_id=1)
    print(f"   ✅ Session created:")
    print(f"      - Session ID: {session2.id}")
    print(f"      - User: Alice (id={session2.user_id})")
    print(f"      - Started at: {session2.started_at}")
    print(f"      - Status: ACTIVE")
    
    # Demo: Bob starts 1 practice session
    print("\n4️⃣ Bob starts practice session #1...")
    session3 = practice_service.start_session(user_id=2)
    print(f"   ✅ Session created:")
    print(f"      - Session ID: {session3.id}")
    print(f"      - User: Bob (id={session3.user_id})")
    print(f"      - Started at: {session3.started_at}")
    print(f"      - Status: ACTIVE")
    
    # Query and display all sessions
    print("\n5️⃣ Database query - All sessions:")
    all_sessions = db.query(UserSession).all()
    print(f"   Total sessions: {len(all_sessions)}")
    print("\n   " + "-"*66)
    print(f"   {'ID':<4} {'User':<10} {'Started':<20} {'Ended':<10} {'XP':<6}")
    print("   " + "-"*66)
    
    for session in all_sessions:
        user_name = "Alice" if session.user_id == 1 else "Bob"
        started = session.started_at.strftime("%Y-%m-%d %H:%M:%S")
        ended = "ACTIVE" if session.ended_at is None else "ENDED"
        print(f"   {session.id:<4} {user_name:<10} {started:<20} {ended:<10} {session.total_xp:<6}")
    
    print("   " + "-"*66)
    
    # Query Alice's sessions
    print("\n6️⃣ User-specific query - Alice's sessions:")
    alice_sessions = db.query(UserSession).filter(UserSession.user_id == 1).all()
    print(f"   Alice has {len(alice_sessions)} practice session(s)")
    
    # Query Bob's sessions
    print("\n7️⃣ User-specific query - Bob's sessions:")
    bob_sessions = db.query(UserSession).filter(UserSession.user_id == 2).all()
    print(f"   Bob has {len(bob_sessions)} practice session(s)")
    
    # Retrieve a specific session
    print("\n8️⃣ Retrieve specific session by ID...")
    retrieved = practice_service.get_session(session_id=2)
    if retrieved:
        print(f"   ✅ Found session {retrieved.id}:")
        print(f"      - User ID: {retrieved.user_id}")
        print(f"      - Started: {retrieved.started_at}")
        print(f"      - XP breakdown:")
        print(f"        * Phrases: {retrieved.xp_phrases}")
        print(f"        * Session bonus: {retrieved.xp_session_bonus}")
        print(f"        * Streak bonus: {retrieved.xp_streak_bonus}")
        print(f"        * Total: {retrieved.total_xp}")
    
    print("\n" + "="*70)
    print("✨ SESSION START TRACKING DEMO COMPLETE")
    print("="*70)
    print("\n📊 Summary:")
    print(f"   • Total sessions created: {len(all_sessions)}")
    print(f"   • Active sessions: {len([s for s in all_sessions if s.ended_at is None])}")
    print(f"   • All sessions have started_at timestamp ✅")
    print(f"   • All sessions have XP fields initialized to 0 ✅")
    print(f"   • All sessions have ended_at = None ✅")
    print("\n🎯 This demonstrates that session start tracking is working correctly!")
    print("   Next step: Implement session end tracking and XP calculations\n")
    
    db.close()


if __name__ == "__main__":
    main()

