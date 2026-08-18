from types import SimpleNamespace

import utils_user


class FakeDocument:
    def __init__(self, uid, settings):
        self.id = uid
        self.settings = settings

    def get(self, field):
        if self.settings is KeyError:
            raise KeyError(field)
        return self.settings


def load_timezones(monkeypatch, documents):
    collection = SimpleNamespace(stream=lambda: documents)
    firestore_client = SimpleNamespace(collection=lambda name: collection)
    monkeypatch.setattr(
        utils_user.utils_firebase, "initialize_firebase_client", lambda: None
    )
    monkeypatch.setattr(utils_user.firestore, "client", lambda: firestore_client)
    return utils_user.get_all_users_timezones()


def test_missing_timezone_falls_back_without_stopping_scheduler(monkeypatch):
    users = load_timezones(
        monkeypatch,
        [
            FakeDocument("missing-settings", KeyError),
            FakeDocument("missing-timezone", {}),
        ],
    )

    assert users == [
        {"uid": "missing-settings", "timezone": "America/New_York"},
        {"uid": "missing-timezone", "timezone": "America/New_York"},
    ]


def test_invalid_timezone_falls_back_without_stopping_scheduler(monkeypatch):
    users = load_timezones(
        monkeypatch,
        [FakeDocument("invalid-timezone", {"timezone": "Not/A_Timezone"})],
    )

    assert users == [
        {"uid": "invalid-timezone", "timezone": "America/New_York"}
    ]
