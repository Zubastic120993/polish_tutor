"""Practice service for managing practice sessions."""

from datetime import datetime, timedelta
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from src.models.user_session import UserSession


def calculate_streak_bonus(streak: int) -> int:
    """
    Calculate XP bonus based on current streak.
    
    Args:
        streak: Current daily streak count
        
    Returns:
        XP bonus amount
    """
    if streak >= 30:
        return 100
    if streak >= 7:
        return 25
    if streak >= 3:
        return 10
    return 0


def calculate_session_bonus() -> int:
    """
    Calculate XP bonus for completing a session.
    
    Returns:
        Fixed session completion bonus (10 XP)
    """
    return 10


class PracticeService:
    """Service for managing practice sessions and session-related operations."""

    def __init__(self, db: Session):
        """Initialize practice service with database session."""
        self.db = db

    def start_session(self, user_id: int) -> UserSession:
        """
        Create a new practice session for a user.

        Args:
            user_id: The ID of the user starting the session

        Returns:
            UserSession: The created session object

        Raises:
            ValueError: If user_id is invalid
        """
        if user_id <= 0:
            raise ValueError("user_id must be a positive integer")

        # Create new session instance
        user_session = UserSession(
            user_id=user_id,
            started_at=datetime.utcnow(),
            ended_at=None,
            duration_seconds=None,
            xp_phrases=0,
            xp_session_bonus=0,
            xp_streak_bonus=0,
            total_xp=0,
            streak_before=0,
            streak_after=0,
        )

        # Add to database and commit
        self.db.add(user_session)
        self.db.commit()
        self.db.refresh(user_session)

        return user_session

    def get_session(self, session_id: int) -> Optional[UserSession]:
        """
        Retrieve a session by its ID.

        Args:
            session_id: The ID of the session to retrieve

        Returns:
            UserSession if found, None otherwise
        """
        return self.db.query(UserSession).filter(UserSession.id == session_id).first()

    def calculate_daily_streak(self, user_id: int) -> Tuple[int, int]:
        """
        Calculate daily streak based on session history.
        
        Checks the last completed session to determine if the user practiced
        yesterday or today. Updates streak accordingly.
        
        Args:
            user_id: The ID of the user
            
        Returns:
            Tuple of (streak_before, streak_after)
        """
        # Get the last completed session (before current one)
        last_session = (
            self.db.query(UserSession)
            .filter(
                UserSession.user_id == user_id,
                UserSession.ended_at.isnot(None)
            )
            .order_by(UserSession.ended_at.desc())
            .first()
        )
        
        today = datetime.utcnow().date()
        
        if not last_session:
            # First session ever - start streak at 0, will become 1
            return 0, 1
        
        last_practice_date = last_session.ended_at.date()
        days_since_last_practice = (today - last_practice_date).days
        
        # Get the streak from last session
        streak_before = last_session.streak_after if hasattr(last_session, 'streak_after') else 0
        
        if days_since_last_practice == 0:
            # Practiced today already - maintain streak
            streak_after = streak_before
        elif days_since_last_practice == 1:
            # Practiced yesterday - continue streak
            streak_after = streak_before + 1
        else:
            # Missed a day - reset streak
            streak_after = 1
        
        return streak_before, streak_after

    def end_session(
        self,
        session_id: int,
        xp_from_phrases: int,
        streak_before: int = 0,
        streak_after: int = 0,
    ) -> UserSession:
        """
        End a practice session and compute metrics including streak bonus.

        Args:
            session_id: The ID of the session to end
            xp_from_phrases: The XP earned from phrases
            streak_before: Daily streak count before this session
            streak_after: Daily streak count after this session

        Returns:
            UserSession: The updated session object

        Raises:
            ValueError: If session_id is invalid or session not found
        """
        if session_id <= 0:
            raise ValueError("session_id must be a positive integer")

        # Look up existing session
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        # Check if already ended
        if session.ended_at is not None:
            raise ValueError(f"Session {session_id} has already been ended")

        # Set end time and compute duration
        ended_at = datetime.utcnow()
        duration_seconds = int((ended_at - session.started_at).total_seconds())

        # Calculate bonuses
        streak_bonus = calculate_streak_bonus(streak_after)
        session_bonus = calculate_session_bonus()

        # Update session fields
        session.ended_at = ended_at
        session.duration_seconds = duration_seconds
        session.xp_phrases = xp_from_phrases
        session.xp_session_bonus = session_bonus
        session.xp_streak_bonus = streak_bonus
        session.streak_before = streak_before
        session.streak_after = streak_after
        session.total_xp = xp_from_phrases + streak_bonus + session_bonus

        # Commit changes
        self.db.commit()
        self.db.refresh(session)

        return session

