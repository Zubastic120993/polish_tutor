"""Unit tests for streak bonus calculation."""

from src.services.practice_service import calculate_streak_bonus


class TestCalculateStreakBonus:
    """Test the calculate_streak_bonus utility function."""
    
    def test_no_bonus_for_streak_0(self):
        """Test that no bonus is given for 0 day streak."""
        assert calculate_streak_bonus(0) == 0
    
    def test_no_bonus_for_streak_1_2(self):
        """Test that no bonus is given for 1-2 day streaks."""
        assert calculate_streak_bonus(1) == 0
        assert calculate_streak_bonus(2) == 0
    
    def test_bonus_10_for_streak_3_6(self):
        """Test that 10 XP bonus is given for 3-6 day streaks."""
        assert calculate_streak_bonus(3) == 10
        assert calculate_streak_bonus(4) == 10
        assert calculate_streak_bonus(5) == 10
        assert calculate_streak_bonus(6) == 10
    
    def test_bonus_25_for_streak_7_29(self):
        """Test that 25 XP bonus is given for 7-29 day streaks."""
        assert calculate_streak_bonus(7) == 25
        assert calculate_streak_bonus(15) == 25
        assert calculate_streak_bonus(29) == 25
    
    def test_bonus_100_for_streak_30_plus(self):
        """Test that 100 XP bonus is given for 30+ day streaks."""
        assert calculate_streak_bonus(30) == 100
        assert calculate_streak_bonus(50) == 100
        assert calculate_streak_bonus(100) == 100

