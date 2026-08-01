import os
import sys

import httpx
from dotenv import load_dotenv


def main():
    load_dotenv()
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    
    if not token:
        print("Error: TELEGRAM_BOT_TOKEN not found in .env")
        sys.exit(1)
        
    if len(sys.argv) < 2:
        print("Usage: python setup_telegram_webhook.py <your-ngrok-url>")
        print("Example: python setup_telegram_webhook.py https://1234-abcd.ngrok-free.app")
        sys.exit(1)
        
    base_url = sys.argv[1].rstrip("/")
    webhook_url = f"{base_url}/api/v1/integrations/telegram/webhook"
    
    print(f"Setting webhook to: {webhook_url}")
    
    api_url = f"https://api.telegram.org/bot{token}/setWebhook"
    response = httpx.post(api_url, json={"url": webhook_url})
    
    if response.status_code == 200:
        print("Success:", response.json())
    else:
        print("Failed:", response.text)

if __name__ == "__main__":
    main()
