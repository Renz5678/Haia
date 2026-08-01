from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest

from integrations.router import generate_telegram_link_code
from integrations.service import handle_telegram_webhook


@pytest.mark.asyncio
async def test_handle_telegram_webhook_valid_link_code():
    with patch("integrations.service.get_supabase_service_client") as mock_client, \
         patch("integrations.service._send_telegram_message") as mock_send_message:
         
        mock_db = MagicMock()
        mock_client.return_value = mock_db
        
        # 1. No active integration found
        mock_db.schema().table().select().eq().eq().eq().execute.return_value.data = []
        
        # 2. Return a pending integration with link_code '123456'
        future_time = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
        mock_db.schema().table().select().eq().eq().execute.return_value.data = [{
            "id": "int-123",
            "metadata": {"link_code": "123456", "expires_at": future_time}
        }]
        
        # Call webhook
        payload = {
            "message": {
                "chat": {"id": 99999},
                "text": "123456"
            }
        }
        await handle_telegram_webhook(payload)
        
        # Verify update was called to activate the account
        mock_db.schema().table().update.assert_called_once()
        update_args = mock_db.schema().table().update.call_args[0][0]
        assert update_args["external_id"] == "99999"
        assert update_args["is_active"] == True
        assert "link_code" not in update_args["metadata"]
        
        # Verify success message sent
        mock_send_message.assert_called_with("99999", "✅ Successfully linked to your Haia account! You can now send me tasks and goals.")

@pytest.mark.asyncio
async def test_handle_telegram_webhook_invalid_link_code():
    with patch("integrations.service.get_supabase_service_client") as mock_client, \
         patch("integrations.service._send_telegram_message") as mock_send_message:
         
        mock_db = MagicMock()
        mock_client.return_value = mock_db
        
        # 1. No active integration found
        mock_db.schema().table().select().eq().eq().eq().execute.return_value.data = []
        
        # 2. Return a pending integration with link_code '123456'
        future_time = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
        mock_db.schema().table().select().eq().eq().execute.return_value.data = [{
            "id": "int-123",
            "metadata": {"link_code": "123456", "expires_at": future_time}
        }]
        
        # Call webhook with WRONG code
        payload = {
            "message": {
                "chat": {"id": 99999},
                "text": "WRONG_CODE"
            }
        }
        await handle_telegram_webhook(payload)
        
        # Verify update was NOT called
        mock_db.schema().table().update.assert_not_called()
        
        # Verify welcome message sent
        mock_send_message.assert_called_with("99999", "Welcome to Haia! Please generate a 6-digit linking code in the Haia Web App settings and send it to me here to connect your account.")

def test_generate_telegram_link_code():
    with patch("core.supabase.get_supabase_service_client") as mock_client:
        mock_db = MagicMock()
        mock_client.return_value = mock_db
        
        user = {"id": "u123"}
        res = generate_telegram_link_code(user)
        
        assert "link_code" in res
        assert len(res["link_code"]) == 6
        assert res["expires_in_minutes"] == 15
        
        # Verify upsert payload
        upsert_args = mock_db.schema().table().upsert.call_args[0][0]
        assert upsert_args["user_id"] == "u123"
        assert upsert_args["is_active"] == False
        assert upsert_args["external_id"] is None
        assert upsert_args["metadata"]["link_code"] == res["link_code"]
