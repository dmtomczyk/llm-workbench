from app.core.config import get_settings


def test_settings_loads_defaults():
    settings = get_settings()
    assert settings.app.name == 'BRIDGE'
    assert settings.server.port == 8080
