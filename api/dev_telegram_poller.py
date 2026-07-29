import os
import sys
import time
import httpx
from dotenv import load_dotenv

def main():
    load_dotenv()
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    
    if not token:
        print("Error: TELEGRAM_BOT_TOKEN not found in .env")
        sys.exit(1)

    print("Deleting any existing webhook...")
    httpx.post(f"https://api.telegram.org/bot{token}/deleteWebhook")
    
    print("Starting local polling... (Press Ctrl+C to stop)")
    offset = None
    
    while True:
        try:
            # Long-poll for updates
            url = f"https://api.telegram.org/bot{token}/getUpdates"
            params = {"timeout": 30}
            if offset:
                params["offset"] = offset
                
            resp = httpx.get(url, params=params, timeout=35)
            data = resp.json()
            
            if not data.get("ok"):
                print("Error from Telegram:", data)
                time.sleep(2)
                continue
                
            for update in data.get("result", []):
                # Update offset to acknowledge receipt
                offset = update["update_id"] + 1
                
                message = update.get("message", {})
                chat_id = message.get("chat", {}).get("id")
                text = message.get("text", "")
                print(f"Forwarding update from Chat ID {chat_id}: '{text}' to localhost:8000...")
                try:
                    local_resp = httpx.post(
                        "http://localhost:8000/api/v1/integrations/telegram/webhook",
                        json=update,
                        timeout=10
                    )
                    if local_resp.status_code != 200:
                        print(f"Local server returned {local_resp.status_code}")
                except Exception as e:
                    print(f"Failed to forward to localhost: {e}. Is your FastAPI server running?")
                    
        except httpx.ReadTimeout:
            # Expected on long-polling timeout with no new messages
            pass
        except Exception as e:
            print(f"Polling error: {e}")
            time.sleep(2)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopped polling.")
