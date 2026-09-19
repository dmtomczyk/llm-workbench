import json

from app.providers.service import SEED_PROVIDERS


def test_atlascloud_seed_provider_is_openai_compatible():
    provider = next(seed for seed in SEED_PROVIDERS if seed["id"] == "prv_atlascloud")

    assert provider["name"] == "atlascloud"
    assert provider["plugin_id"] == "openai_compatible"
    assert provider["provider_kind"] == "openai_compatible"
    assert provider["base_url"] == "https://api.atlascloud.ai/v1"
    assert provider["default_model"] == "qwen/qwen3.5-flash"
    assert provider["auth_type"] == "bearer"
    assert provider["secret_alias"] == "ATLASCLOUD_API_KEY"
    assert provider["enabled"] == 1


def test_atlascloud_seed_provider_capabilities_are_chat_ready():
    provider = next(seed for seed in SEED_PROVIDERS if seed["id"] == "prv_atlascloud")
    capabilities = json.loads(provider["capabilities_json"])

    assert capabilities == {
        "streaming": True,
        "json_mode": True,
        "usage_metrics": True,
        "conversation_state": False,
        "tools": False,
    }
