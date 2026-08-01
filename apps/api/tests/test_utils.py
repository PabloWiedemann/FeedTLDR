import pytest
import pytz
from datetime import datetime
from utils import convert_timezone_to_utc


class TestConvertTimezoneToUTC:
    """Test suite for the convert_timezone_to_utc function."""

    def test_timezone_string_conversion(self):
        """Test conversion from timezone string to UTC offset format."""
        # Test various timezone strings
        test_cases = [
            ("America/New_York", "UTC-05:00"),  # EST (during standard time)
            ("America/Los_Angeles", "UTC-08:00"),  # PST (during standard time)
            ("Europe/London", "UTC+00:00"),  # GMT
            ("Asia/Tokyo", "UTC+09:00"),  # JST
            ("Australia/Sydney", "UTC+11:00"),  # AEDT (during daylight time)
        ]

        for tz_string, expected_pattern in test_cases:
            result = convert_timezone_to_utc(tz_string)
            # Check format is correct
            assert result.startswith("UTC"), f"Expected UTC prefix for {tz_string}"
            assert ":" in result, f"Expected colon in offset for {tz_string}"

    def test_timezone_object_conversion(self):
        """Test conversion from pytz timezone object to UTC offset format."""
        # Test with timezone objects (the bug case)
        test_timezones = [
            pytz.timezone("America/New_York"),
            pytz.timezone("America/Los_Angeles"),
            pytz.timezone("Europe/London"),
            pytz.timezone("Asia/Tokyo"),
            pytz.timezone("Australia/Sydney"),
        ]

        for tz_obj in test_timezones:
            result = convert_timezone_to_utc(tz_obj)
            # Check format is correct
            assert result.startswith("UTC"), f"Expected UTC prefix for {tz_obj.zone}"
            assert ":" in result, f"Expected colon in offset for {tz_obj.zone}"
            # Check it matches the format UTC+HH:MM or UTC-HH:MM
            assert len(result) == 9, f"Expected format 'UTC+HH:MM' for {tz_obj.zone}"

    def test_already_utc_format_string(self):
        """Test that strings already in UTC+HH:MM format are returned as-is."""
        utc_formats = [
            "UTC+00:00",
            "UTC-05:00",
            "UTC+09:00",
            "UTC-08:00",
        ]

        for utc_str in utc_formats:
            result = convert_timezone_to_utc(utc_str)
            assert result == utc_str, f"Expected {utc_str} to be returned as-is"

    def test_utc_timezone(self):
        """Test conversion of UTC timezone."""
        # Test with string "UTC" - returns as-is since it starts with "UTC"
        result_str = convert_timezone_to_utc("UTC")
        assert result_str == "UTC"

        # Test with object - converts to proper UTC+00:00 format
        result_obj = convert_timezone_to_utc(pytz.timezone("UTC"))
        assert result_obj == "UTC+00:00"

    def test_specific_bug_case_america_los_angeles(self):
        """
        Test the specific bug case from the error log:
        'America/Los_Angeles' object has no attribute 'upper'

        This was happening when a timezone object was passed instead of a string.
        """
        # This is the exact case that was failing before the fix
        tz_obj = pytz.timezone("America/Los_Angeles")

        # This should not raise an AttributeError
        result = convert_timezone_to_utc(tz_obj)

        # Verify it returns a valid UTC offset format
        assert result.startswith("UTC")
        assert ":" in result
        assert len(result) == 9  # UTC+HH:MM or UTC-HH:MM

    def test_consistency_between_string_and_object(self):
        """Test that string and object inputs produce the same result."""
        test_zones = [
            "America/New_York",
            "America/Los_Angeles",
            "Europe/London",
            "Asia/Tokyo",
        ]

        for zone_name in test_zones:
            result_from_string = convert_timezone_to_utc(zone_name)
            result_from_object = convert_timezone_to_utc(pytz.timezone(zone_name))

            assert result_from_string == result_from_object, \
                f"String and object conversion should match for {zone_name}"

    def test_offset_format_validation(self):
        """Test that the output format is always UTC+HH:MM or UTC-HH:MM."""
        test_inputs = [
            "America/New_York",
            pytz.timezone("America/Los_Angeles"),
            "Europe/Paris",
            pytz.timezone("Asia/Shanghai"),
        ]

        for tz_input in test_inputs:
            result = convert_timezone_to_utc(tz_input)

            # Validate format
            assert result.startswith("UTC"), f"Result should start with 'UTC': {result}"
            assert result[3] in ['+', '-'], f"Fourth character should be + or -: {result}"
            assert result[4:6].isdigit(), f"Hours should be digits: {result}"
            assert result[6] == ":", f"Should have colon separator: {result}"
            assert result[7:9] == "00", f"Minutes should be 00: {result}"

    def test_bug_regression_callbacks_scenario(self):
        """
        Regression test for the bug that occurred in callbacks.py.

        In callbacks.py:104, the code was calling:
        timezone=pytz.timezone(st.session_state.timezone)

        This passed a timezone object instead of a string to run_flow_for_user,
        which eventually called convert_timezone_to_utc with a timezone object.

        This test simulates that exact scenario.
        """
        # Simulate what happens in callbacks.py
        timezone_string = "America/Los_Angeles"
        timezone_object = pytz.timezone(timezone_string)

        # This should not raise: AttributeError: 'America/Los_Angeles' object has no attribute 'upper'
        try:
            result = convert_timezone_to_utc(timezone_object)
            # Should succeed and return valid UTC offset
            assert result.startswith("UTC")
            assert ":" in result
        except AttributeError as e:
            pytest.fail(f"convert_timezone_to_utc raised AttributeError with timezone object: {e}")

    def test_bug_regression_gen_script_scenario(self):
        """
        Regression test for the bug that occurred in gen_script.py.

        In gen_script.py:69,146, the code creates a timezone object and passes it through
        the pipeline. This test ensures that scenario works.
        """
        # Simulate what happens in gen_script.py
        user_tz_city = "America/Los_Angeles"
        user_tz = pytz.timezone(user_tz_city)

        # This would be passed to run_flow_for_user and eventually to convert_timezone_to_utc
        try:
            result = convert_timezone_to_utc(user_tz)
            # Should succeed and return valid UTC offset
            assert result.startswith("UTC")
            assert len(result) == 9  # UTC+HH:MM format
        except AttributeError as e:
            pytest.fail(f"convert_timezone_to_utc raised AttributeError: {e}")
